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
  parse(library, libraryId, newLib, width, height, start, duration, offset, startTime, inPoint, outPoint);
  res.animate = [];
  // 分别分析每个变换，过程很相似
  let { anchorPoint, opacity, position, rotateX, rotateY, rotateZ, scale } = transform;
  if(Array.isArray(anchorPoint) && anchorPoint.length) {
    res.animate.push(transformOrigin(anchorPoint, start, duration, offset));
  }
  if(Array.isArray(opacity) && opacity.length) {
    res.animate.push(transformOpacity(opacity, start, duration, offset));
  }
  if(Array.isArray(position) && position.length) {
    res.animate.push(transformPosition(position, start, duration, offset));
  }
  if(Array.isArray(rotateX) && rotateX.length) {
    res.animate.push(transformRotateX(rotateX, start, duration, offset));
  }
  if(Array.isArray(rotateX) && rotateX.length) {
    res.animate.push(transformRotateY(rotateY, start, duration, offset));
  }
  if(Array.isArray(rotateX) && rotateZ.length) {
    res.animate.push(transformRotateZ(rotateZ, start, duration, offset));
  }
  if(Array.isArray(scale) && scale.length) {
    res.animate.push(transformScale(scale, start, duration, offset));
  }
  return res;
}

function parse(library, id, newLib) {
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
      let temp = recursion(item, library, newLib, width, height, workAreaStart, workAreaDuration, 0);
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
