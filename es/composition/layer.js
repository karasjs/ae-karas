import transform from './transform';
import enums from '../enums';

export default function(layer, library) {
  let res = {
    name: layer.name,
    // width: layer.width,
    // height: layer.height,
    enabled: layer.solo || layer.enabled, // 可能是个隐藏的父级链接图层
    startTime: layer.startTime, // 开始时间，即时间轴上本图层初始位置
    inPoint: layer.inPoint, // 真正开始显示时间，>= startTime，可能有前置空白不显示的一段
    outPoint: layer.outPoint, // 真正结束显示时间，<= duration绝对值，可能有后置空白不显示的一段
  };
  $.ae2karas.dispatch(enums.EVENT.LOG, 'layer: ' + res.name);
  for(let i = 1; i <= layer.numProperties; i++) {
    let prop = layer.property(i);
    if(prop && prop.enabled) {
      switch(prop.matchName) {
        case 'ADBE Transform Group': // 根元素
        case 'ADBE Vector Transform Group': // 非根元素
          res.transform = transform(prop);
          break;
        case 'ADBE Root Vectors Group': // 根元素
        case 'ADBE Vectors Group':
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
  if(source) {
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
};
