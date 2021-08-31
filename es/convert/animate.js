export function transformOrigin(list, start, duration, offset, startTime, inPoint, outPoint) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      transformOrigin: list[0][0] + ' ' + list[0][1],
    });
  }
  else {
    // 根据工作区间的时间，外加图层的偏移时间，递归的偏移量计算开始结束事件
    let begin = startTime + offset;
    let startIndex, endIndex;
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
    }
  }
  return res;
}

export function transformOpacity(list, start, duration, offset, startTime, inPoint, outPoint) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      opacity: list[0] * 0.01,
    });
  }
  else {
  }
  return res;
}

export function transformPosition(list, start, duration, offset, startTime, inPoint, outPoint) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      translate: list[0][0] + ' ' + list[0][1],
    });
  }
  else {
  }
  return res;
}

export function transformRotateX(list, start, duration, offset, startTime, inPoint, outPoint) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      rotateX: list[0],
    });
  }
  else {
  }
  return res;
}

export function transformRotateY(list, start, duration, offset, startTime, inPoint, outPoint) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      rotateY: list[0],
    });
  }
  else {
  }
  return res;
}


export function transformRotateZ(list, start, duration, offset, startTime, inPoint, outPoint) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      rotateZ: list[0],
    });
  }
  else {
  }
  return res;
}

export function transformScale(list, start, duration, offset, startTime, inPoint, outPoint) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      scaleX: list[0][0] * 0.01,
      scaleY: list[0][1] * 0.01,
      scaleZ: list[0][2] * 0.01,
    });
  }
  else {
  }
  return res;
}
