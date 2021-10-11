import path from './path';

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
  // 截取首帧部分
  else if(first.time < begin) {
    let next = list[1];
    let percent = (begin - first.time) / (next.time - first.time);
    first.time = begin;
    first.value = reducer(first.value, next.value, percent, true);
    if(first.easing) {
      let points = sliceBezier([
        [0, 0],
        [first.easing[0], first.easing[1]],
        [first.easing[2], first.easing[3]],
        [1, 1],
      ].reverse(), percent).reverse();
      first.easing = [points[1][0], points[1][1], points[2][0], points[2][1]];
    }
  }
  // 截取尾帧部分，同上
  let last = list[list.length - 1];
  if(last.time > begin + duration) {
    let prev = list[list.length - 2];
    let percent = (begin + duration - prev.time) / (last.time - prev.time);
    last.time = begin + duration;
    last.value = reducer(prev.value, last.value, percent);
    if(prev.easing) {
      let points = sliceBezier([
        [0, 0],
        [prev.easing[0], prev.easing[1]],
        [prev.easing[2], prev.easing[3]],
        [1, 1],
      ], percent);
      prev.easing = [points[1][0], points[1][1], points[2][0], points[2][1]];
    }
  }
  // 补齐尾帧，同上
  else if(last.time < begin + duration) {
    let o = {
      time: begin + duration,
      value: Array.isArray(last.value) ? last.value.slice(0) : last.value,
    };
    list.push(o);
  }
  return list;
}

/**
 * 百分比截取贝塞尔中的一段，t为[0, 1]
 * @param points
 * @param t
 */
function sliceBezier(points, t) {
  let p1 = points[0], p2 = points[1], p3 = points[2], p4 = points[3];
  let x1 = p1[0], y1 = p1[1];
  let x2 = p2[0], y2 = p2[1];
  let x3 = p3[0], y3 = p3[1];
  let x12 = (x2 - x1) * t + x1;
  let y12 = (y2 - y1) * t + y1;
  let x23 = (x3 - x2) * t + x2;
  let y23 = (y3 - y2) * t + y2;
  let x123 = (x23 - x12) * t + x12;
  let y123 = (y23 - y12) * t + y12;
  if(points.length === 4) {
    let x4 = p4[0], y4 = p4[1];
    let x34 = (x4 - x3) * t + x3;
    let y34 = (y4 - y3) * t + y3;
    let x234 = (x34 - x23) * t + x23;
    let y234 = (y34 - y23) * t + y23;
    let x1234 = (x234 - x123) * t + x123;
    let y1234 = (y234 - y123) * t + y123;
    return [[x1, y1], [x12, y12], [x123, y123], [x1234, y1234]];
  }
  else if(points.length === 3) {
    return [[x1, y1], [x12, y12], [x123, y123]];
  }
}

export function transformOrigin(list, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
      iterations: 1,
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
        easing: item.easing,
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
      iterations: 1,
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
        easing: item.easing,
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
      iterations: 1,
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
    list = getAreaList(list, begin, duration, function(prev, next, percent, isStart) {
      // 特殊的translatePath曲线动画
      if(prev.length === 8) {
        if(isStart) {
          let points = [];
          for(let i = 0, len = prev.length; i < len; i++) {
            let item = prev[i];
            points.push(item.slice(0));
          }
          points = sliceBezier(points.reverse(), percent);
          return points.reverse();
        }
        else {
          return sliceBezier(prev, percent);
        }
      }
      return [
        prev[0] + (next[0] - prev[0]) * percent,
        prev[1] + (next[1] - prev[1]) * percent,
        prev[2] + (next[2] - prev[2]) * percent,
      ];
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      let o = {
        offset: (item.time - begin) / duration,
        easing: item.easing,
      };
      if(item.value.length === 8) {
        o.translatePath = item.value;
      }
      else {
        o.translateX = item.value[0];
        o.translateY = item.value[1];
      }
      res.value.push(o);
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
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      rotateX: -list[0],
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
        rotateX: -item.value,
        easing: item.easing,
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
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      rotateY: -list[0],
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
        rotateY: -item.value,
        easing: item.easing,
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
      iterations: 1,
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
        easing: item.easing,
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
      iterations: 1,
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
        easing: item.easing,
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
      iterations: 1,
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
        easing: item.easing,
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

export function transformPoints(list, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    let { vertices, inTangents, outTangents, closed } = list[0];
    let o = path.parse(vertices, inTangents, outTangents, closed);
    res.value.push({
      points: o.points,
      controls: o.controls,
    });
    res.data = o;
  }
  else {
    list = getAreaList(list, begin, duration, function(prev, next, percent, isStart) {
      let { vertices1, inTangents1, outTangents1, closed } = prev;
      let { vertices2, inTangents2, outTangents2 } = next;
      let vertices = [], inTangents = [], outTangents = [];
      for(let i = 0, len = vertices1.len; i < len; i++) {
        let p = vertices1[i], n = vertices2[i];
        let pIn = inTangents1[(i + 1) % len], nIn = inTangents2[(i + 1) % len];
        let pOut = outTangents1[i], nOut = outTangents2[i];
        // 直线切割或贝塞尔切割
        if(pIn[0] === 0 && pIn[1] === 0
          && nIn[0] === 0 && nIn[1] === 0
          && pOut[0] === 0 && pOut[1] === 0
          && nOut[0] === 0 && nOut[1] === 0) {
          vertices.push([
            p[0] + (n[0] - p[0]) * percent,
            p[1] + (n[1] - p[1]) * percent
          ]);
          inTangents.push([0, 0]);
          outTangents.push([0, 0]);
        }
        else {
          let arr = [
            p,
            pOut,
            pIn,
            n,
          ];
          if(isStart) {
            arr.reverse();
          }
          let s = sliceBezier(arr, percent);
          vertices.push(s[3]);
          if(isStart) {
            inTangents.push(s[1]);
            outTangents.push(s[2]);
          }
          else {
            inTangents.push(s[2]);
            outTangents.push(s[1]);
          }
        }
      }
      return {
        vertices,
        inTangents,
        outTangents,
        closed,
      };
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      let { vertices, inTangents, outTangents, closed } = item.value;
      let o;
      if(i === 0) {
        o = path.parse(vertices, inTangents, outTangents, closed);
        res.data = o;
      }
      else {
        o = path.parse(vertices, inTangents, outTangents, closed, res.data.x1, res.data.y1, res.data.x2, res.data.y2);
      }
      res.value.push({
        offset: (item.time - begin) / duration,
        points: o.points,
        controls: o.controls,
      });
    }
  }
  return res;
}

export function transformFill(fill, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(fill.color.length === 1) {
    let first = fill.color[0];
    let v = [
      parseInt(first[0] * 255),
      parseInt(first[1] * 255),
      parseInt(first[2] * 255),
      first[3],
    ];
    if(fill.opacity[0] < 100) {
      v[3] *= fill.opacity[0] * 0.01;
    }
    res.value.push({
      fill: [v],
    });
  }
  else {
    let len = fill.color[0].length;
    let list = getAreaList(fill.color, begin, duration, function(prev, next, percent) {
      let arr = [];
      for(let i = 0; i < len; i++) {
        arr[i] = prev[i] + (next[i] - prev[i]) * percent;
      }
      return arr;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      let v = [
        parseInt(item[0] * 255),
        parseInt(item[1] * 255),
        parseInt(item[2] * 255),
        item[3],
      ];
      if(fill.opacity[i] < 100) {
        v[3] *= fill.opacity[i] * 0.01;
      }
      res.value.push({
        offset: (item.time - begin) / duration,
        fill: [v],
      });
    }
  }
  return res;
}

export function transformStroke(stroke, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(stroke.color.length === 1) {
    let first = stroke.color[0];
    let v = [
      parseInt(first[0] * 255),
      parseInt(first[1] * 255),
      parseInt(first[2] * 255),
      first[3],
    ];
    if(stroke.opacity[0] < 100) {
      v[3] *= stroke.opacity[0] * 0.01;
    }
    res.value.push({
      stroke: [v],
    });
  }
  else {
    let list = getAreaList(stroke.color, begin, duration, function(prev, next, percent) {
      return prev + (next - prev) * percent;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      let v = [
        parseInt(item[0] * 255),
        parseInt(item[1] * 255),
        parseInt(item[2] * 255),
        item[3],
      ];
      if(stroke.opacity[i] < 100) {
        v[3] *= stroke.opacity[i] * 0.01;
      }
      res.value.push({
        offset: (item.time - begin) / duration,
        stroke: [v],
      });
    }
  }
  return res;
}

export function transformStrokeWidth(list, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      strokeWidth: list,
    });
  }
  else {
    let len = list[0].length;
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      let arr = [];
      for(let i = 0; i < len; i++) {
        arr[i] = prev[i] + (next[i] - prev[i]) * percent;
      }
      return arr;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        strokeWidth: item.value,
      });
    }
  }
  return res;
}

export function transformLineJoin(list, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    let arr;
    if(list[0] === 1) {
      arr = ['miter'];
    }
    else if(list[0] === 2) {
      arr = ['round'];
    }
    else {
      arr = ['bevel'];
    }
    res.value.push({
      strokeLinejoin: arr,
    });
  }
  else {
    list = getAreaList(list, begin, duration, function(prev, next, percent, isFirst) {
      return isFirst ? prev : next;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      let arr = [];
      for(let i = 0, len = item.value.length; i < len; i++) {
        let item2 = item.value[i];
        if(item2 === 1) {
          arr.push('miter');
        }
        else if(item2 === 2) {
          arr.push('round');
        }
        else {
          arr.push('bevel');
        }
      }
      res.value.push({
        offset: (item.time - begin) / duration,
        strokeLinejoin: arr,
      });
    }
  }
  return res;
}

export function transformMiterLimit(list, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      strokeWidth: list,
    });
  }
  else {
    let len = list[0].length;
    list = getAreaList(list, begin, duration, function(prev, next, percent) {
      let arr = [];
      for(let i = 0; i < len; i++) {
        arr[i] = prev[i] + (next[i] - prev[i]) * percent;
      }
      return arr;
    });
    for(let i = 0, len = list.length; i < len; i++) {
      let item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        strokeWidth: item.value,
      });
    }
  }
  return res;
}

// export function transformPosition(list, begin, duration) {}

export function transformSize(list, begin, duration) {
  let res = {
    value: [],
    options: {
      duration,
      fill: 'forwards',
      iterations: 1,
    },
  };
  // 只有1帧没有动画，无需计算补间
  if(list.length === 1) {
    res.value.push({
      size: list[0],
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
        size: item.value,
      });
    }
  }
  return res;
}
