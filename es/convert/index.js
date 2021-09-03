import {
  transformOrigin,
  transformOpacity,
  transformPosition,
  transformRotateX,
  transformRotateY,
  transformRotateZ,
  transformScale,
} from './animate';

function recursion(data, library, newLib, w, h, start, duration, offset) {
  // 父级链接不可见时无需导出
  if(!data.enabled) {
    return null;
  }
  let { name, libraryId, width, height, transform, startTime, inPoint, outPoint } = data;
  let begin = start + offset;
  // 图层在工作区外可忽略
  if(inPoint >= begin + duration || outPoint <= begin) {
    return null;
  }
  let res = {
    libraryId,
    name,
    init: {
      style: {},
    },
  };
  parse(library, libraryId, newLib, width, height, start, duration, offset + startTime);
  res.animate = [];
  // 特殊的visibility动画，如果图层可见在工作区间内，需要有动画，否则可以无视
  if(inPoint > begin || outPoint < begin + duration) {
    let v = {
      value: [],
      options: {
        duration,
        fill: 'forwards',
      },
    };
    // 开头不可见，默认init的style
    if(inPoint > begin) {
      res.init.style.visibility = 'hidden';
      res.init.style.pointerEvents = 'none';
      v.value.push({
        offset: 0,
      });
      v.value.push({
        offset: (inPoint - begin) / duration,
        visibility: 'inherit',
        pointerEvents: 'auto',
      });
    }
    // 结尾计算
    if(outPoint < begin + duration) {
      // 可能是第一帧但offset不为0，不用担心karas会补充空首帧
      v.value.push({
        offset: (outPoint - begin) / duration,
        visibility: 'hidden',
        pointerEvents: 'none',
      });
      // 默认不是隐藏需补结束帧为隐藏，否则karas会填补空关键帧
      if(inPoint <= begin) {
        v.value.push({
          offset: 1,
          visibility: 'hidden',
          pointerEvents: 'none',
        });
      }
    }
    res.animate.push(v);
  }
  // 分别分析每个变换，过程很相似，当为单帧时需合并到init.style，多帧第一帧需合并且置空
  let { anchorPoint, opacity, position, rotateX, rotateY, rotateZ, scale } = transform;
  let begin2 = start - offset;
  if(Array.isArray(anchorPoint) && anchorPoint.length) {
    let t = transformOrigin(anchorPoint, begin2, duration);
    let first = t.value[0];
    let v = first.transformOrigin.split(' ');
    v[0] = parseFloat(v[0]);
    v[1] = parseFloat(v[1]);
    if(v[0] !== width * 0.5 || v[1] !== height * 0.5) {
      res.init.style.transformOrigin = first.transformOrigin;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
    }
    // ae中位置相对于anchor，而不是默认左上角原点，因此有个位置计算
    if(v[0]) {
      res.init.style.left = -v[0];
    }
    if(v[1]) {
      res.init.style.top = -v[1];
    }
  }
  if(Array.isArray(opacity) && opacity.length) {
    let t = transformOpacity(opacity, begin2, duration);
    let first = t.value[0];
    if(first.opacity !== 1) {
      res.init.style.opacity = first.opacity;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
    }
  }
  if(Array.isArray(position) && position.length) {
    let t = transformPosition(position, begin2, duration);
    let first = t.value[0];
    if(first.translateX) {
      res.init.style.translateX = first.translateX;
    }
    if(first.translateY) {
      res.init.style.translateY = first.translateY;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
    }
  }
  if(Array.isArray(rotateX) && rotateX.length) {
    let t = transformRotateX(rotateX, begin2, duration);
    let first = t.value[0];
    if(first.rotateX) {
      res.init.style.rotateX = first.rotateX;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
    }
  }
  if(Array.isArray(rotateY) && rotateY.length) {
    let t = transformRotateY(rotateY, begin2, duration);
    let first = t.value[0];
    if(first.rotateY) {
      res.init.style.rotateY = first.rotateY;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
    }
  }
  if(Array.isArray(rotateZ) && rotateZ.length) {
    let t = transformRotateZ(rotateZ, begin2, duration);
    let first = t.value[0];
    if(first.rotateZ) {
      res.init.style.rotateZ = first.rotateZ;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
    }
  }
  if(Array.isArray(scale) && scale.length) {
    let t = transformScale(scale, begin, duration);
    let first = t.value[0];
    if(first.scaleX !== 1) {
      res.init.style.scaleX = first.scaleX;
    }
    if(first.scaleY !== 1) {
      res.init.style.scaleY = first.scaleY;
    }
    if(first.scaleZ !== 1) {
      res.init.style.scaleZ = first.scaleZ;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
    }
  }
  return res;
}

function parse(library, id, newLib, w, h, start, duration, offset) {
  let data = library[id];
  let { type, name, src, width, height, children } = data;
  let res = newLib[id] = {
    id,
    name,
    tagName: type,
    props: {
      style: {
        position: 'absolute',
        width,
        height,
      },
    },
  };
  if(type === 'img') {
    res.props.src = src;
  }
  else if(Array.isArray(children)) {
    res.children = [];
    for(let i = 0, len = children.length; i < len; i++) {
      let item = children[i];
      let temp = recursion(item, library, newLib, width, height, start, duration, offset);
      if(temp) {
        res.children.push(temp);
      }
    }
  }
}

export default function(data) {
  let { workAreaStart, workAreaDuration, result, library } = data;
  let { name, width, height, children } = result;
  let newLib = [];
  let res = {
    name,
    tagName: 'div',
    props: {
      style: {
        position: 'absolute',
        width,
        height,
      },
    },
    library: newLib,
    abbr: false,
  };
  if(Array.isArray(children)) {
    res.children = [];
    for(let i = 0, len = children.length; i < len; i++) {
      let item = children[i];
      let temp = recursion(item, library, newLib, width, height, workAreaStart, workAreaDuration, 0);
      if(temp) {
        res.children.push(temp);
      }
    }
  }
  return res;
}
