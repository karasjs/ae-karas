import { transformLayer, transformMask } from './transform';
import vector from './vector';
import render from '../render';

let uuid = 0;
let compList = [];

function recursion(composition, library, navigationShapeTree) {
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
    // mask经常为不可见状态，不能忽略掉，所以关系全部记下来，不可见layer在转化那里剔除
    // if(hasSolo) {
    //   if(!item.solo) {
    //     continue;
    //   }
    // }
    // else {
    //   if(!item.enabled) {
    //     continue;
    //   }
    // }
    if(item.parent && item.parent.index) {
      asParent[item.parent.index] = true;
      asChild[item.index] = item.parent.index;
    }
  }
  // 遍历分析图层，独奏时只看独奏图层，否则看可见图层
  let children = [];
  outer:
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
    // mask看应用图层对象是否可见
    if(item.isTrackMatte) {
      for(let j = i + 1; j <= layers.length; j++) {
        let item2 = layers[j];
        if(!item2.isTrackMatte) {
          if(hasSolo) {
            if(!item2.solo) {
              continue outer;
            }
            else {
              break;
            }
          }
          else {
            if(!item2.enabled) {
              continue outer;
            }
            else {
              break;
            }
          }
        }
      }
    }
    let o = parseLayer(item, library, navigationShapeTree, hasSolo);
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

function parseLayer(layer, library, navigationShapeTree, hasSolo) {
  let res = {
    name: layer.name,
    index: layer.index,
    width: layer.width,
    height: layer.height,
    startTime: layer.startTime * 1000, // 开始时间，即时间轴上本图层初始位置
    inPoint: layer.inPoint * 1000, // 真正开始显示时间，>= startTime，可能有前置空白不显示的一段
    outPoint: layer.outPoint * 1000, // 真正结束显示时间，<= duration绝对值，可能有后置空白不显示的一段
    blendingMode: layer.blendingMode,
    guide: layer.guideLayer,
    ddd: layer.threeDLayer,
  };
  // 摄像机图层特殊处理，其它看遮罩
  let matchName = layer.matchName;
  if(matchName === 'ADBE Camera Layer') {
    res.ddd = true;
    res.isCamera = true;
  }
  else if(layer.isTrackMatte) {
    res.isMask = true;
    res.isClip = layer.trackMatteType === TrackMatteType.ALPHA_INVERTED
      || layer.trackMatteType === TrackMatteType.LUMA_INVERTED;
  }
  navigationShapeTree.push(res.name);
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
      navigationShapeTree.push(prop.name);
      switch(matchName) {
        case 'ADBE Transform Group':
          res.transform = transformLayer(prop);
          break;
        case 'ADBE Root Vectors Group':
          // 形状图层中的内容子属性
          if(res.enabled) {
            geom = vector(prop, navigationShapeTree);
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
        case 'ADBE Camera Options Group':
          if(res.isCamera) {
            for(let i = 1; prop && i <= prop.numProperties; i++) {
              let item = prop.property(i);
              if(item && item.enabled) {
                let matchName = item.matchName;
                if(matchName === 'ADBE Camera Zoom') {
                  res.cameraZoom = item.value;
                }
                else if(matchName === 'ADBE Camera Depth of Field') {
                  res.cameraDepthOfField = item.value;
                }
                else if(matchName === 'ADBE Camera Focus Distance') {
                  res.cameraFocusDistance = item.value;
                }
                else if(matchName === 'ADBE Camera Aperture') {
                  res.cameraAperture = item.value;
                }
                else if(matchName === 'ADBE Camera Blur Level') {
                  res.cameraBlurLevel = item.value;
                }
              }
            }
          }
          break;
      }
      navigationShapeTree.pop();
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
      let asset, hasExist;
      // 图片图形等独立资源，将其解析为被link的放入library即可
      if(source instanceof FootageItem) {
        let src = source.file && source.file.fsName;
        // 空图层偶现有source但无source.file，视作空图层
        if(src) {
          let name = source.name;
          let newName;
          let path;
          let isPsd = /\.psd$/.test(name) || /\.ai$/.test(name);
          if(isPsd) {
            path = src.replace(/[^\/]*\.\w+$/, '');
            newName = name.replace(/[\/.:?*<>|\\'"]/g, '_') + '.png';
            src = path + newName;
          }
          if(!/\.jpg$/.test(src)
            && !/\.jpeg$/.test(src)
            && !/\.png/.test(src)
            && !/\.webp/.test(src)
            && !/\.gif/.test(src)) {
            return;
          }
          for(let i = 0; i < library.length; i++) {
            let item = library[i];
            if(item.src === src && item.type === 'img') {
              asset = item;
              hasExist = true;
              break;
            }
          }
          if(!hasExist) {
            if(isPsd) {
              render.psd2png(source, path, newName);
            }
            asset = {
              type: 'img',
              name,
              width: source.width,
              height: source.height,
              src,
            };
          }
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
      // 合成，递归分析，需要缓存起来，防止重复使用合成生成多余的library对象
      else if(source instanceof CompItem) {
        // TODO，仅静态无动画可复用，否则时间轴对不齐
        // for(let i = 0, len = compList.length; i < len; i++) {
        //   if(source === compList[i].source) {
        //     hasExist = true;
        //     asset = compList[i].asset;
        //     break;
        //   }
        // }
        if(!hasExist) {
          asset = recursion(source, library, navigationShapeTree);
          asset.type = 'div';
          compList.push({
            source,
            asset,
          });
        }
      }
      if(asset) {
        if(!hasExist) {
          asset.id = library.length;
          library.push(asset);
        }
        res.assetId = asset.id;
      }
    }
  }
  navigationShapeTree.pop();
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
  let res = {
    name: prop.name,
  };
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Text Document':
          let value = item.value;
          res.content = {
            font: value.font,
            fontFamily: value.fontFamily,
            fontStyle: value.fontStyle,
            fontSize: value.fontSize,
            leading: value.leading,
            baselineLocs: value.baselineLocs,
            text: value.text,
          };
          if(value.applyFill) {
            res.content.fillColor = value.fillColor;
            res.content.strokeOver = value.strokeOverFill;
          }
          if(value.applyStroke) {
            res.content.stroke = value.strokeColor;
            res.content.strokeWidth = value.strokeWidth;
          }
          // 固定已知尺寸时有
          if(value.boxText) {
            res.content.size = value.boxTextSize;
            res.content.position = value.boxTextPos;
          }
          break;
      }
    }
  }
  return res;
}

export default function(composition) {
  $.ae2karas.error('parse');
  compList.splice(0);
  // 递归遍历合成，转换ae的图层为普通js对象
  let { workAreaStart, workAreaDuration, displayStartTime } = composition;
  workAreaStart *= 1000;
  workAreaDuration *= 1000;
  $.ae2karas.log('workArea: ' + workAreaStart + ',' + workAreaDuration + ',' + displayStartTime);
  if(displayStartTime) {
    displayStartTime *= 1000;
    workAreaStart += displayStartTime;
  }
  let library = [], navigationShapeTree = [];
  let result = recursion(composition, library, navigationShapeTree);
  $.ae2karas.log(result);
  $.ae2karas.log(library);
  return {
    workAreaStart,
    workAreaDuration,
    result,
    library,
  };
}
