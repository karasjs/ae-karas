const LAYER_TRANSFORM = {
  'ADBE Anchor Point': 'anchorPoint',
  'ADBE Position': 'position',
  'ADBE Position_0': 'position_0',
  'ADBE Position_1': 'position_1',
  'ADBE Position_2': 'position_2',
  'ADBE Scale': 'scale',
  'ADBE Orientation': 'orientation',
  'ADBE Rotate X': 'rotateX',
  'ADBE Rotate Y': 'rotateY',
  'ADBE Rotate Z': 'rotateZ',
  'ADBE Opacity': 'opacity',
};

const VECTOR_TRANSFORM = {
  'ADBE Vector Anchor': 'anchorPoint',
  'ADBE Vector Position': 'position',
  'ADBE Vector Scale': 'scale',
  'ADBE Vector Skew': 'skew',
  'ADBE Vector Skew Axis': 'skewAxis',
  'ADBE Vector Rotation': 'rotateZ',
  'ADBE Vector Group Opacity': 'opacity',
  'ADBE Vector Trim Start': 'start',
  'ADBE Vector Trim End': 'end',
};

const MASK_TRANSFORM = {
  'ADBE Mask Shape': 'points',
  'ADBE Mask Opacity': 'opacity',
};

function getPropertyValues(prop, matchName, noEasing) {
  let { numKeys } = prop;
  // 根据关键帧数量，2+帧是普通变化，1帧等同于0帧value
  if(numKeys && numKeys > 1) {
    let arr = [];
    for(let i = 1; i <= numKeys; i++) {
      // 特殊的曲线位移动画用translatePath表示
      if(i !== numKeys && (matchName === 'ADBE Position' || matchName === 'ADBE Vector Position')) {
        let v1 = prop.keyValue(i), v2 = prop.keyValue(i + 1);
        let c1 = prop.keyOutSpatialTangent(i), c2 = prop.keyInSpatialTangent(i + 1);
        // y = kx + b，看是否有曲线，没有忽略
        let x1 = v1[0], y1 = v1[1], x2 = v2[0], y2 = v2[1];
        // 有z失效，因为是3d空间变换
        let isZ = v1.length > 2 && v1[2] || v2.length > 2 && v2[2];
        if((x1 !== x2 || y1 !== y2) && !isZ && (c1[0] !== 0 || c1[1] !== 0 || c2[0] !== 0 || c2[1] !== 0)) {
          let p1 = [v1[0] + c1[0], v1[1] + c1[1]], p2 = [v2[0] + c2[0], v2[1] + c2[1]];
          // 垂直特殊情况
          if(x1 === 0 && x2 === 0) {
            if(Math.abs(c1[0]) >= 1 || Math.abs(c2[0]) >= 1) {
              let o = {
                time: prop.keyTime(i) * 1000,
                value: [x1, y1, p1[0], p1[1], p2[0], p2[1], x2, y2],
              };
              if(i !== numKeys && !noEasing) {
                let e = getEasing(prop, i, i + 1);
                if(e) {
                  o.easing = e;
                }
              }
              arr.push(o);
              continue;
            }
          }
          // 二元一次方程
          else {
            let k, b;
            if(x1 === 0) {
              b = y1;
              k = (y2 - b) / x2;
            }
            else if(x2 === 0) {
              b = y2;
              k = (y1 - b) / x1;
            }
            else {
              let r = x1 / x2;
              b = (y1 - y2 * r) / (1 - r);
              k = (y1 - b) / x1;
            }
            // 精度小于一定认为无效
            let is1 = Math.abs(k * p1[0] + b - p1[1]) >= 1;
            let is2 = Math.abs(k * p2[0] + b - p2[1]) >= 1;
            if(is1 || is2) {
              let o = {
                time: prop.keyTime(i) * 1000,
                value: [x1, y1, p1[0], p1[1], p2[0], p2[1], x2, y2],
              };
              if(i !== numKeys && !noEasing) {
                let e = getEasing(prop, i, i + 1);
                if(e) {
                  o.easing = e;
                }
              }
              arr.push(o);
              continue;
            }
          }
        }
      }
      let o = {
        time: prop.keyTime(i) * 1000,
        value: prop.keyValue(i),
      };
      if(i !== numKeys && !noEasing) {
        let e = getEasing(prop, i, i + 1);
        if(e) {
          o.easing = e;
        }
        if(matchName === 'ADBE Position'
          && (prop.keyValue(i)[2] || prop.keyValue(i + 1)[2])
          && prop.keyValue(i)[2] !== prop.keyValue(i + 1)[2]) {
          let e = getEasing(prop, i, i + 1, true);
          if(e) {
            o.easing2 = e;
          }
        }
      }
      arr.push(o);
    }
    return arr;
  }
  else if(numKeys && numKeys > 0) {
    return [prop.keyValue(1)];
  }
  else {
    return [prop.value];
  }
}

/**
 * https://www.zhihu.com/question/24404065
 * 柄点1的X值 = 关键帧1的影响值/100
 * 柄点1的Y值 = 关键帧1的输出速度/两关键帧平均速度*柄点1的X值
 * 柄点2的X值 = 1 - 关键帧2的影响值/100
 * 柄点2的Y值 = 1 - 关键帧2的输入速度/两关键帧平均速度*柄点2的X值
 * @param prop
 * @param start
 * @param end
 * @param isZ
 */
function getEasing(prop, start, end, isZ) {
  let t1 = prop.keyTime(start), t2 = prop.keyTime(end);
  let v1 = prop.keyValue(start), v2 = prop.keyValue(end);
  let e1 = prop.keyOutTemporalEase(start)[0], e2 = prop.keyInTemporalEase(end)[0];
  // let c1 = prop.keyOutSpatialTangent(start), c2 = prop.keyInSpatialTangent(end);
  // $.ae2karas.warn(t1);
  // $.ae2karas.warn(t2);
  // $.ae2karas.warn(isZ);
  // $.ae2karas.log(v1);
  // $.ae2karas.log(v2);
  // $.ae2karas.log(e1);
  // $.ae2karas.log(e2);
  // $.ae2karas.log(c1);
  // $.ae2karas.log(c2);
  let x1 = e1.influence * 0.01, x2 = 1 - e2.influence * 0.01;
  let y1, y2;
  let matchName = prop.matchName;
  if([
    'ADBE Anchor Point', 'ADBE Position',
    'ADBE Vector Anchor', 'ADBE Vector Position',
    'ADBE Scale', 'ADBE Vector Scale',
    'ADBE Vector Skew'].indexOf(matchName) > -1) {
    let avSpeedX = Math.abs(v2[0] - v1[0]) / (t2 - t1);
    let avSpeedY = Math.abs(v2[1] - v1[1]) / (t2 - t1);
    if(isZ) {
      avSpeedY = Math.abs(v2[2] - v1[2]) / (t2 - t1);
    }
    let avSpeed = Math.sqrt(avSpeedX * avSpeedX + avSpeedY * avSpeedY);
    if(v2.length > 2 && v1.length > 2) {
      let avSpeedZ = Math.abs(v2[2] - v1[2]) / (t2 - t1);
      avSpeed = Math.sqrt(avSpeedX * avSpeedX + avSpeedY * avSpeedY + avSpeedZ * avSpeedZ);
    }
    if(avSpeed !== 0) {
      y1 = x1 * e1.speed / avSpeed;
      y2 = 1 - (1 - x2) * e2.speed / avSpeed;
    }
  }
  else if(v2 !== v1){
    let avSpeed = Math.abs(v2 - v1) / (t2 - t1);
    y1 = x1 * e1.speed / avSpeed;
    y2 = 1 - (1 - x2) * e2.speed / avSpeed;
  }
  if(x1 === y1 && x2 === y2 || y1 === undefined || y2 === undefined) {
    return;
  }
  return [x1, y1, x2, y2];
}

export function transformLayer(prop) {
  let res = {};
  for(let i = 1; prop && i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      if(LAYER_TRANSFORM.hasOwnProperty(matchName)) {
        res[LAYER_TRANSFORM[matchName]] = getPropertyValues(item, matchName, false);
      }
    }
  }
  return res;
}

export function transformVector(prop) {
  let res = {};
  for(let i = 1; prop && i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      if(VECTOR_TRANSFORM.hasOwnProperty(matchName)) {
        res[VECTOR_TRANSFORM[matchName]] = getPropertyValues(item, matchName, false);
      }
    }
  }
  return res;
}

export function transformMask(prop) {
  let res = {};
  for(let i = 1; prop && i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      if(MASK_TRANSFORM.hasOwnProperty(matchName)) {
        res[MASK_TRANSFORM[matchName]] = getPropertyValues(item, matchName, true);
      }
    }
  }
  return res;
}

export function transformGeom(prop) {
  return getPropertyValues(prop, '', true);
}
