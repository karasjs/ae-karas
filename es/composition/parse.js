import enums from '../enums';
import layer from './layer';

function recursion(composition, library) {
  let { name, layers, width, height, duration } = composition;
  $.ae2karas.dispatch(enums.EVENT.LOG, 'composition: ' + name);
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
    children.push(layer(item, library));
  }
  return {
    width,
    height,
    duration, // 合成的总时长
    children,
  };
}

export default function(composition) {
  // 递归遍历合成，转换ae的图层为普通js对象
  let { workAreaStart, workAreaDuration } = composition;
  // workAreaStart *= 1000;
  // workAreaDuration *= 1000;
  $.ae2karas.dispatch(enums.EVENT.LOG, workAreaDuration + ',' + workAreaStart);
  let library = [];
  let children = recursion(composition, library);
  $.ae2karas.dispatch(enums.EVENT.LOG, children);
  $.ae2karas.dispatch(enums.EVENT.LOG, library);
  return 1;
}
