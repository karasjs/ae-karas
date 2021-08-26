import transform from './transform';

function recursion(composition) {
  let { layers, width, height, workAreaStart, workAreaDuration } = composition;
  // 先统计哪些层被作为父级链接
  let hasChildLink = {};
  for(let i = 1; i <= layers.length; i++) {
    let layer = layers[i];
    if(layer.parent && layer.parent.index) {
      hasChildLink[layer.parent.index] = true;
    }
  }
  // 是否是独奏模式
  let hasSolo;
  for(let i = 1; i <= layers.length; i++) {
    let layer = layers[i];
    if(layer.solo) {
      hasSolo = true;
      break;
    }
  }
  // 遍历分析图层，独奏时只看独奏图层，否则看可见图层
  for(let i = 1; i <= layers.length; i++) {
    let layer = layers[i];
    if(hasSolo) {
      if(!layer.solo) {
        continue;
      }
    }
    else {
      if(!layer.enabled) {
        continue;
      }
    }
    let res = parseLayer(layer);
  }
}

function parseLayer(layer) {
  let res = {
    name: layer.name,
  };
  for(let i = 1; i <= layer.numProperties; i++) {
    let prop = layer.property(i);
    if(prop && prop.enabled) {
      switch(prop.matchName) {
        case 'ADBE Transform Group': // 根元素
        case 'ADBE Vector Transform Group': // 非根元素
          res.transform = transform(prop);
          break;
      }
    }
  }
  return res;
}

export default function(composition) {
  // 递归遍历合成，转换ae的图层为普通js对象
  let { layers, width, height, workAreaStart, workAreaDuration } = composition;
  workAreaStart *= 1000;
  workAreaDuration *= 1000;
  // alert(workAreaDuration + ',' + workAreaStart);
  recursion(composition);
  return 1;
}
