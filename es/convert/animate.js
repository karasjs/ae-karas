/**
 * 2个及以上的关键帧，获取区间，有可能有超过范围的无效关键帧，需滤除
 * 也有可能不及工作区间，需补充首尾，和原有首尾一样复制一个出来对齐区间
 * 也有可能虽然在范围外，但范围上无关键帧，需截取至范围内，由每个特效传入截取回调
 * @param list
 * @param begin
 * @param duration
 * @param reducer 当关键帧范围在工作区间外时，每个特效传入的截取函数
 * @returns {(number|number)[]}
 */
function getAreaList(list, begin, duration, reducer) {
  let len = list.length;
  let startIndex = 0, endIndex = len - 1;
  // 在区间外围的如果只有1帧则需包括，多余的去除，正好则符合，包含则需填补
  for(let i = 0; i < len; i++) {
    let item = list[i];
    if(item.time < begin) {
      startIndex = i;
    }
    else if(item.time > begin) {
      break;
    }
    else {
      startIndex = i;
      break;
    }
  }
  // 结尾同上
  for(let i = len - 1; i >= 0; i--) {
    let item = list[i];
    if(item.time < begin + duration) {
      break;
    }
    else if(item.time > begin + duration) {
      endIndex = i;
    }
    else {
      endIndex = i;
      break;
    }
  }
  if(startIndex > 0 || endIndex < len - 1) {
    list = list.slice(startIndex, endIndex + 1);
  }
  // 补齐首帧，当关键帧在工作区间内的时候
  let first = list[0];
  if(first.time > begin) {
    let o = {
      time: begin,
      value: Array.isArray(first.value) ? first.value.slice(0) : first.value,
    };
    list.unshift(o);
  }
  else if(first.time < begin) {
    let next = list[1];
    let percent = (begin - first.time) / (next.time - first.time);
    first.time = begin;
    first.value = reducer(first.value, next.value, percent);
  }
  // 补齐尾帧，同上
  let last = list[list.length - 1];
  if(last.time > begin + duration) {
    let prev = list[list.length - 2];
    let percent = (begin + duration - prev.time) / (last.time - prev.time);
    last.time = begin + duration;
    last.value = reducer(prev.value, last.value, percent);
  }
  else if(last.time < begin + duration) {
    let o = {
      time: begin + duration,
      value: Array.isArray(first.value) ? first.value.slice(0) : first.value,
    };
    list.push(o);
  }
  return list;
}

export function transformOrigin(list, begin, duration) {
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
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      return [
        prev[0] + (next[0] - prev[0]) * percent,
        prev[1] + (next[1] - prev[1]) * percent,
      ];
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        transformOrigin: item.value[0] + ' ' + item.value[1],
      });
    }
  }
  return res;
}

export function transformOpacity(list, begin, duration) {
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
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      return prev + (next - prev) * percent;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        opacity: item.value * 0.01,
      });
    }
  }
  return res;
}

export function transformPosition(list, begin, duration) {
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
      translateX: list[0][0],
      translateY: list[0][1],
    });
  }
  else {
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      return [
        prev[0] + (next[0] - prev[0]) * percent,
        prev[1] + (next[1] - prev[1]) * percent,
        prev[2] + (next[2] - prev[2]) * percent,
      ];
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        translateX: item.value[0],
        translateY: item.value[1],
      });
    }
  }
  return res;
}

export function transformRotateX(list, begin, duration) {
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
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      return prev + (next - prev) * percent;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        rotateX: item.value,
      });
    }
  }
  return res;
}

export function transformRotateY(list, begin, duration) {
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
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      return prev + (next - prev) * percent;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        rotateY: item.value,
      });
    }
  }
  return res;
}


export function transformRotateZ(list, begin, duration) {
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
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      return prev + (next - prev) * percent;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        rotateZ: item.value,
      });
    }
  }
  return res;
}

export function transformScale(list, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    let v = {
      scaleX: list[0][0] * 0.01,
      scaleY: list[0][1] * 0.01,
    };
    if(list[0].length > 2) {
      v.scaleZ = list[0][2] * 0.01;
    }
    res.value.push(v);
  }
  else {
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      return [
        prev[0] + (next[0] - prev[0]) * percent,
        prev[1] + (next[1] - prev[1]) * percent,
        prev[2] + (next[2] - prev[2]) * percent,
      ];
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      let v = {
        offset: (item.time - begin) / duration,
        scaleX: item.value[0] * 0.01,
        scaleY: item.value[1] * 0.01,
      };
      if(item.value.length > 2) {
        v.scaleZ = item.value[2] * 0.01;
      }
      res.value.push(v);
    }
  }
  return res;
}

export function transformPath(list, begin, duration, isEnd) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    let v = {
    };
    if(isEnd) {
      v.end = list[0] * 0.01;
    }
    else {
      v.start = list[0] * 0.01;
    }
    res.value.push(v);
  }
  else {
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      return (prev + (next - prev) * percent) * 0.01;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      let v = {
        offset: (item.time - begin) / duration,
      };
      if(isEnd) {
        v.end = item.value * 0.01;
      }
      else {
        v.start = item.value * 0.01;
      }
      res.value.push(v);
    }
  }
  return res;
}
