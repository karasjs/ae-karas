import { transformLayer, transformMask } from './transform';
import vector from './vector';
import render from '../render';

let uuid = 0;

function recursion(composition, library) {
  let { name, layers, width, height, displayStartTime, duration } = composition;
  $.ae2karas.error('composition: ' + name);
  // 是否是独奏模式
  let hasSolo;
  for(let i = 1; i <= layers.length; i++) {
    let item = layers[i];
    if(item.solo) {
      hasSolo = true;
      break;
    }
  }
  // 再统计哪些层被作为父级链接，asParent以索引为key是否父级链接为值，asChild以索引为key父级索引为值
  let asParent = {}, asChild = {};
  for(let i = 1; i <= layers.length; i++) {
    let item = layers[i];
    if(hasSolo) {
      if(!item.solo) {
        continue;
      }
    }
    else {
      if(!item.enabled) {
        continue;
      }
    }
    if(item.parent && item.parent.index) {
      asParent[item.parent.index] = true;
      asChild[item.index] = item.parent.index;
    }
  }
  let children = [];
  // 遍历分析图层，独奏时只看独奏图层，否则看可见图层
  for(let i = 1; i <= layers.length; i++) {
    let item = layers[i];
    let index = item.index;
    // 根据是否独奏或可见决定是否分析或跳过，被作为父级链接的即便不可见也要统计
    if(!asParent.hasOwnProperty(index)) {
      if(hasSolo) {
        if(!item.solo && !item.isTrackMatte) {
          continue;
        }
      }
      else {
        if(!item.enabled && !item.isTrackMatte) {
          continue;
        }
      }
    }
    let o = parseLayer(item, library, hasSolo);
    if(o) {
      // 父级打标uuid的同时，之前记录的hash也记录下来
      if(asParent.hasOwnProperty(index)) {
        asParent[index] = o.asParent = uuid++;
      }
      // mask/clip类型在被遮罩层上
      if(i > 1 && o.isClip) {
        let last = children[children.length - 1];
        if(last && last.isMask) {
          last.isClip = true;
        }
      }
      children.push(o);
    }
  }
  // children还要遍历一遍，根据父级链接增加指向父级的字段
  for(let i = 0; i < children.length; i++) {
    let item = children[i];
    let index = item.index;
    if(asChild.hasOwnProperty(index)) {
      item.asChild = asParent[asChild[index]];
    }
  }
  children.reverse();
  return {
    type: 'div',
    name,
    width,
    height,
    displayStartTime: displayStartTime * 1000, // 开始时间码
    duration: duration * 1000, // 合成的总时长
    children,
  };
}

function parseLayer(layer, library, hasSolo) {
  let res = {
    name: layer.name,
    index: layer.index,
    width: layer.width,
    height: layer.height,
    startTime: layer.startTime * 1000, // 开始时间，即时间轴上本图层初始位置
    inPoint: layer.inPoint * 1000, // 真正开始显示时间，>= startTime，可能有前置空白不显示的一段
    outPoint: layer.outPoint * 1000, // 真正结束显示时间，<= duration绝对值，可能有后置空白不显示的一段
    blendingMode: layer.blendingMode,
    isMask: layer.isTrackMatte,
    isClip: layer.trackMatteType === TrackMatteType.ALPHA_INVERTED,
  };
  // 标明图层是否可见，也许不可见但作为父级链接也要分析
  if(hasSolo) {
    res.enabled = layer.solo || layer.isTrackMatte;
  }
  else {
    res.enabled = layer.enabled || layer.isTrackMatte;
  }
  $.ae2karas.warn('layer: ' + res.name);
  let geom, txt;
  for(let i = 1; i <= layer.numProperties; i++) {
    let prop = layer.property(i);
    if(prop && prop.enabled) {
      let matchName = prop.matchName;
      switch(matchName) {
        case 'ADBE Transform Group':
          res.transform = transformLayer(prop);
          break;
        case 'ADBE Root Vectors Group':
          // 形状图层中的内容子属性
          if(res.enabled) {
            geom = vector(prop, library);
          }
          break;
        case 'ADBE Mask Parade':
          if(res.enabled) {
            res.mask = mask(prop);
          }
          break;
        case 'ADBE Text Properties':
          if(res.enabled) {
            txt = text(prop);
          }
          break;
      }
    }
  }
  // 可能是作为父级链接，如果不可见则不需要内容
  if(res.enabled) {
    let source = layer.source;
    if(geom && geom.shape && geom.shape.content && geom.shape.content.length) {
      geom.geom = true; // 特殊标识
      geom.type = 'div';
      geom.id = library.length;
      library.push(geom);
      res.assetId = geom.id;
    }
    else if(txt) {
      txt.text = true; // 特殊标识
      txt.type = 'span';
      txt.id = library.length;
      library.push(txt);
      res.assetId = txt.id;
    }
    else if(source) {
      let asset;
      // 图片图形等独立资源，将其解析为被link的放入library即可
      if(source instanceof FootageItem) {
        let src = source.file && source.file.fsName;
        let name = source.name;
        if(/\.psd$/.test(name)) {
          let path = src.replace(/[^\/]*\.psd$/, '');
          let newName = name.replace(/[\/.]/g, '_') + '_layer_' + layer.index + '.png';
          render.psd2png(source, src, path, newName);
          src = path + newName;
        }
        if(!/\.jpg$/.test(src)
          && !/\.jpeg$/.test(src)
          && !/\.png/.test(src)
          && !/\.webp/.test(src)
          && !/\.gif/.test(src)) {
          return;
        }
        let hasExist;
        for(let i = 0; i < library.length; i++) {
          let item = library[i];
          if(item.src === src && item.type === 'img') {
            asset = item;
            hasExist = true;
            break;
          }
        }
        if(!hasExist) {
          if(src) {
            asset = {
              type: 'img',
              name,
              width: source.width,
              height: source.height,
              src,
            };
          }
          // 颜色类型没有src
          else {
            asset = {
              type: 'div',
              width: source.width,
              height: source.height,
            }
          }
        }
      }
      // 合成，递归分析
      else if(source instanceof CompItem) {
        asset = recursion(source, library);
        asset.type = 'div';
      }
      if(asset) {
        asset.id = library.length;
        library.push(asset);
        res.assetId = asset.id;
      }
    }
  }
  return res;
}

function mask(prop) {
  let res = {};
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      if(matchName === 'ADBE Mask Atom') {
        if(item.maskMode !== MaskMode.NONE) {
          res.enabled = true;
        }
        res.list = transformMask(item);
        res.mode = item.maskMode;
        res.inverted = item.inverted;
      }
    }
  }
  return res;
}

function text(prop) {
  let res = {};
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Text Document':
          let value = item.value;
          res.content = {
            fillColor: value.fillColor,
            font: value.font,
            fontFamily: value.fontFamily,
            fontStyle: value.fontStyle,
            fontSize: value.fontSize,
            leading: value.leading,
            baselineLocs: value.baselineLocs,
            text: value.text,
          };
          break;
      }
    }
  }
  return res;
}

export default function(composition) {
  $.ae2karas.error('parse');
  // 递归遍历合成，转换ae的图层为普通js对象
  let { workAreaStart, workAreaDuration } = composition;
  workAreaStart *= 1000;
  workAreaDuration *= 1000;
  $.ae2karas.log('workArea: ' + workAreaStart + ',' + workAreaDuration);
  let library = [];
  let result = recursion(composition, library);
  $.ae2karas.log(result);
  $.ae2karas.log(library);
  return {
    workAreaStart,
    workAreaDuration,
    result,
    library,
  };
}
