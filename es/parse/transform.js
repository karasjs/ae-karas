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
  'ADBE Vector Rotation': 'rotation',
  'ADBE Vector Group Opacity': 'opacity',
  'ADBE Vector Trim Start': 'start',
  'ADBE Vector Trim End': 'end',
};

function getPropertyValues(prop) {
  let { numKeys } = prop;
  // 根据关键帧数量，2+帧是普通变化，1帧等同于0帧value
  if(numKeys && numKeys > 1) {
    let arr = [];
    for(let i = 1; i <= numKeys; i++) {
      arr.push({
        time: prop.keyTime(i) * 1000,
        value: prop.keyValue(i),
        easing: i === numKeys ? undefined : getEasing(prop, i, i + 1),
      });
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
 */
function getEasing(prop, start, end) {
  let t1 = prop.keyTime(start), t2 = prop.keyTime(end);
  let v1 = prop.keyValue(start), v2 = prop.keyValue(end);
  let e1 = prop.keyOutTemporalEase(start)[0], e2 = prop.keyInTemporalEase(end)[0];
  let x1 = e1.influence * 0.01, x2 = 1 - e2.influence * 0.01;
  let y1 = 0, y2 = 1;
  let matchName = prop.matchName;
  if([
    'ADBE Anchor Point', 'ADBE Position',
    'ADBE Vector Anchor', 'ADBE Vector Position',
    'ADBE Vector Scale', 'ADBE Vector Skew'].indexOf(matchName) > -1) {
    let avSpeedX = Math.abs(v2[0] - v1[0]) / (t2 - t1);
    let avSpeedY = Math.abs(v2[1] - v1[1]) / (t2 - t1);
    let avSpeed = Math.sqrt(avSpeedX * avSpeedX + avSpeedY * avSpeedY);
    y1 = x1 * e1.speed / avSpeed;
    y2 = 1 - (1 - x2) * e2.speed / avSpeed;
  }
  else {
    let avSpeedX = Math.abs(v2 - v1) / (t2 - t1);
    let avSpeedY = Math.abs(v2 - v1) / (t2 - t1);
    let avSpeed = Math.sqrt(avSpeedX * avSpeedX + avSpeedY * avSpeedY);
    y1 = x1 * e1.speed / avSpeed;
    y2 = 1 - (1 - x2) * e2.speed / avSpeed;
  }
  if(x1 === y1 && x2 === y2) {
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
        res[LAYER_TRANSFORM[matchName]] = getPropertyValues(item);
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
        res[VECTOR_TRANSFORM[matchName]] = getPropertyValues(item);
      }
    }
  }
  return res;
}
