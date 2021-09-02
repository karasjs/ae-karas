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
  let { libraryId, width, height, transform, startTime, inPoint, outPoint } = data;
  let res = {
    libraryId,
    init: {
      style: {},
    },
  };
  parse(library, libraryId, newLib, width, height, start, duration, offset + startTime);
  res.animate = [];
  // 特殊的visibility动画，如果图层可见在工作区间内，需要有动画，否则可以无视
  let begin = start + offset;
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
        visibility: 'hidden',
        pointerEvents: 'none',
      });
      v.value.push({
        offset: (inPoint - begin) / duration,
        visibility: 'inherit',
        pointerEvents: 'auto',
      });
    }
    // 结尾计算
    if(outPoint < begin + duration) {
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
  // 分别分析每个变换，过程很相似
  let { anchorPoint, opacity, position, rotateX, rotateY, rotateZ, scale } = transform;
  if(Array.isArray(anchorPoint) && anchorPoint.length) {
    res.animate.push(transformOrigin(anchorPoint, begin, duration));
  }
  if(Array.isArray(opacity) && opacity.length) {
    res.animate.push(transformOpacity(opacity, begin, duration));
  }
  if(Array.isArray(position) && position.length) {
    res.animate.push(transformPosition(position, begin, duration));
  }
  if(Array.isArray(rotateX) && rotateX.length) {
    res.animate.push(transformRotateX(rotateX, begin, duration));
  }
  if(Array.isArray(rotateX) && rotateX.length) {
    res.animate.push(transformRotateY(rotateY, begin, duration));
  }
  if(Array.isArray(rotateX) && rotateZ.length) {
    res.animate.push(transformRotateZ(rotateZ, begin, duration));
  }
  if(Array.isArray(scale) && scale.length) {
    res.animate.push(transformScale(scale, begin, duration));
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
  $.ae2karas.warn(res);
  return res;
}
