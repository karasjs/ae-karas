import { transformLayer } from './transform';
import vector from './vector';

function recursion(composition, library) {
  let { name, layers, width, height, duration } = composition;
  $.ae2karas.error('composition: ' + name);
  // 先统计哪些层被作为父级链接
  let childLink = {};
  for(let i = 1; i <= layers.length; i++) {
    let item = layers[i];
    if(item.parent && item.parent.index) {
      childLink[item.parent.index] = true;
    }
  }
  // 是否是独奏模式
  let hasSolo;
  for(let i = 1; i <= layers.length; i++) {
    let item = layers[i];
    if(item.solo) {
      hasSolo = true;
      break;
    }
  }
  let children = [];
  // 遍历分析图层，独奏时只看独奏图层，否则看可见图层
  for(let i = 1; i <= layers.length; i++) {
    let item = layers[i];
    let index = item.index;
    // 被作为父级链接的即便不可见也要统计
    if(!childLink.hasOwnProperty(index)) {
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
    }
    children.push(parseLayer(item, library));
  }
  return {
    name,
    width,
    height,
    duration, // 合成的总时长
    children,
  };
}

function parseLayer(layer, library) {
  let res = {
    name: layer.name,
    width: layer.width,
    height: layer.height,
    enabled: layer.solo || layer.enabled, // 可能是个隐藏的父级链接图层
    startTime: layer.startTime, // 开始时间，即时间轴上本图层初始位置
    inPoint: layer.inPoint, // 真正开始显示时间，>= startTime，可能有前置空白不显示的一段
    outPoint: layer.outPoint, // 真正结束显示时间，<= duration绝对值，可能有后置空白不显示的一段
  };
  $.ae2karas.warn('layer: ' + res.name);
  let geom;
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
          geom = vector(prop, library);
          break;
        case 'ADBE Mask Parade':
          // todo mask
          break;
        case 'ADBE Text Properties':
          // todo text
          break;
      }
    }
  }
  let source = layer.source;
  if(geom && geom.content && geom.content.type) {
    geom.type = geom.content.type;
    geom.id = library.length;
    library.push(geom);
    res.libraryId = geom.id;
  }
  else if(source) {
    let asset;
    // 图片图形等独立资源，将其解析为被link的放入library即可
    if(source instanceof FootageItem) {
      let src = source.file && source.file.fsName;
      let name = source.name;
      if(/\.psd$/.test(name)) {
        let path = name.split(';/');
        src = path.slice(0, path.length - 1).join('/') + '@@' + src;
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
      res.libraryId = asset.id;
    }
  }
  return res;
}

export default function(composition) {
  // 递归遍历合成，转换ae的图层为普通js对象
  let { workAreaStart, workAreaDuration } = composition;
  // workAreaStart *= 1000;
  // workAreaDuration *= 1000;
  $.ae2karas.log('workArea: ' + workAreaDuration + ',' + workAreaStart);
  let library = [];
  let children = recursion(composition, library);
  $.ae2karas.log(children);
  $.ae2karas.log(library);
  return 1;
}
