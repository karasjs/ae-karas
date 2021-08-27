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
};

function getPropertyValues(prop) {
  let { numKeys } = prop;
  // 根据关键帧数量，2+帧是普通变化，1帧等同于0帧value
  if(numKeys > 1) {
    let arr = [];
    for(let i = 1; i <= numKeys; i++) {
      arr.push({
        time: prop.keyTime(i),
        value: prop.keyValue(i),
        // TODO timeFunction
      });
    }
    return arr;
  }
  else if(numKeys > 0) {
    return [prop.keyValue(1)];
  }
  else {
    return [prop.value];
  }
}

export default function(prop) {
  let res = {};
  for(let i = 1; prop && i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      if(LAYER_TRANSFORM.hasOwnProperty(matchName)) {
        res[LAYER_TRANSFORM[matchName]] = getPropertyValues(item);
      }
      else if(VECTOR_TRANSFORM.hasOwnProperty(matchName)) {
        res[VECTOR_TRANSFORM[matchName]] = getPropertyValues(item);
      }
    }
  }
  return res;
};
