import {
  transformOrigin,
  transformOpacity,
  transformPosition,
  transformRotateX,
  transformRotateY,
  transformRotateZ,
  transformScale,
} from './animate';

/**
 * 动画和初始init部分转换
 * @param data
 * @param library
 * @param newLib
 * @param w
 * @param h
 * @param start
 * @param duration
 * @param offset
 * @returns {null|{init: {style: {}}, libraryId: ({enabled}|*), name: ({enabled}|*)}}
 */
function recursion(data, library, newLib, w, h, start, duration, offset) {
  // 作为父级链接不可见时无需导出
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
    let t = transformScale(scale, begin2, duration);
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

/**
 * 静态部分转换，library中无动画的部分
 * @param library
 * @param id
 * @param newLib
 * @param w
 * @param h
 * @param start
 * @param duration
 * @param offset
 */
function parse(library, id, newLib, w, h, start, duration, offset) {
  let data = library[id];
  let { type, name, src, width, height, children, geom } = data;
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
  // 矢量图层特殊解析，添加
  if(geom) {
    parseGeom(res, data, start, duration, offset);
  }
  // 图片无children
  else if(type === 'img') {
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

/**
 * 形状图层特殊的直接为其生成一个内联children
 * @param res
 * @param data
 * @param start
 * @param duration
 * @param offset
 */
function parseGeom(res, data, start, duration, offset) {
  let { content, fill, stroke, transform } = data;
  let { type, direction, size, position, roundness, points } = content;
  let f = [fill.color[0] * 255, fill.color[1] * 255, fill.color[2] * 255, fill.color[3]];
  if(fill.opacity !== 100) {
    f[3] *= fill.opacity * 0.01;
  }
  let s = [stroke.color[0] * 255, stroke.color[1] * 255, stroke.color[2] * 255, stroke.color[3]];
  if(stroke.opacity !== 100) {
    s[3] *= stroke.opacity * 0.01;
  }
  let child = {
    props: {
      style: {
        position: 'absolute',
        fill: [f],
        strokeWidth: [stroke.width],
        stroke: [s],
        strokeLinejoin: [stroke.lineJoin],
        strokeMiterlimit: [stroke.miterLimit],
      },
    },
    animate: [],
  };
  if(stroke.dashes) {
    child.props.style.strokeDasharray = [stroke.dashes];
  }
  if(type === 'rect') {
    child.tagName = '$rect';
    child.props.style.width = size[0];
    child.props.style.height = size[1];
  }
  else if(type === 'ellipse') {
    child.tagName = '$ellipse';
    child.props.style.width = size[0];
    child.props.style.height = size[1];
  }
  else if(type === 'star') {
    child.tagName = '$polyline';
  }
  else if(type === 'path') {
    child.tagName = '$polyline';
    let { vertices, inTangents, outTangents, closed } = points;
    let x1 = vertices[0][0], y1 = vertices[0][1];
    let x2 = x1, y2 = y1;
    for(let i = 1, len = vertices.length; i < len; i++) {
      let item = vertices[i];
      x1 = Math.max(x1, item[0]);
      y1 = Math.max(y1, item[1]);
      x2 = Math.min(x2, item[0]);
      y2 = Math.min(y2, item[1]);
      // 控制点是相对于顶点的坐标
      let it = inTangents[i], ot = outTangents[i];
      if(it[0]) {
        x1 = Math.max(x1, item[0] + it[0]);
        x2 = Math.min(x2, item[0] + it[0]);
      }
      if(it[1]) {
        y1 = Math.max(y1, item[1] + it[1]);
        y2 = Math.min(y2, item[1] + it[1]);
      }
      if(ot[0]) {
        x1 = Math.max(x1, item[0] + ot[0]);
        x2 = Math.min(x2, item[0] + ot[0]);
      }
      if(ot[1]) {
        y1 = Math.max(y1, item[1] + ot[1]);
        y2 = Math.min(y2, item[1] + ot[1]);
      }
    }
    // path尺寸为顶点的最大最小差值
    let w = child.props.style.width = x1 - x2;
    let h = child.props.style.height = y1 - y2;
    let pts = [], cts = [];
    for(let i = 0, len = vertices.length; i < len; i++) {
      let item = vertices[i];
      pts.push([
        (item[0] - x2) / w,
        (item[1] - y2) / h,
      ]);
      let it = inTangents[i], ot = outTangents[i];
      // 上一个顶点到本顶点
      if(it[0] || it[1]) {
        let j = i - 1;
        if(j === -1) {
          j = len - 1;
        }
        cts[j] = cts[j] || [];
        cts[j].push(pts[i][0] + it[0] / w);
        cts[j].push(pts[i][1] + it[1] / h);
      }
      // 本顶点到下一个顶点
      if(ot[0] || ot[1]) {
        cts[i] = cts[i] || [];
        cts[i].push(pts[i][0] + ot[0] / h);
        cts[i].push(pts[i][1] + ot[1] / h);
      }
    }
    if(closed) {
      pts.push(pts[0].slice(0));
    }
    child.props.points = pts;
    child.props.controls = cts;
    // path的特殊位置计算
    child.props.style.left = x2;
    child.props.style.top = y2;
  }
  // path没有position
  if(position && position[0]) {
    child.props.style.left = -position[0];
  }
  if(position && position[1]) {
    child.props.style.top = -position[1];
  }
  if(fill.rule === 2) {
    child.props.style.fillRule = 'evenodd';
  }
  if(type === 'rect' && roundness) {
    child.props.rx = roundness / size[0];
    child.props.ry = roundness / size[1];
  }
  // geom内嵌的transform单独分析
  let { anchorPoint, opacity, position: position2, rotateX, rotateY, rotateZ, scale } = transform;
  let begin2 = start - offset;
  if(Array.isArray(anchorPoint) && anchorPoint.length) {
    let t = transformOrigin(anchorPoint, begin2, duration);
    let first = t.value[0];
    let v = first.transformOrigin.split(' ');
    v[0] = parseFloat(v[0]);
    v[1] = parseFloat(v[1]);
    /**
     * path很特殊，原始没有宽高，ae是锚点0,0相对于自身左上角原点，定位则是锚点来进行定位
     * 需记录最初的位置，发生锚点动画时，其会干扰left/top，同步形成位置动画
     */
    if(type === 'path') {
      let left = child.props.style.left;
      let top = child.props.style.top;
      child.props.style.left -= v[0];
      child.props.style.top -= v[1];
      let w = child.props.style.width;
      let h = child.props.style.height;
      v[0] += w * 0.5;
      v[1] += h * 0.5;
      if(v[0] !== w * 0.5 || v[1] !== h * 0.5) {
        child.props.style.transformOrigin = first.transformOrigin;
      }
      if(t.value.length > 1) {
        if(first.offset === 0) {
          t.value[0] = {
            offset: 0,
          };
        }
        // tfo的每个动画需考虑对坐标的影响
        for(let i = 1, len = t.value.length; i < len; i++) {
          let item = t.value[i];
          let tfo = item.transformOrigin.split(' ');
          tfo[0] = parseFloat(tfo[0]);
          tfo[1] = parseFloat(tfo[1]);
          item.left = left - tfo[0];
          item.top = top - tfo[1];
        }
        child.animate.push(t);
      }
    }
    else {
      // tfo中心判断，加上尺寸*0.5
      v[0] += size[0] * 0.5;
      v[1] += size[1] * 0.5;
      if(v[0] !== size[0] * 0.5 || v[1] !== size[1] * 0.5) {
        child.props.style.transformOrigin = first.transformOrigin;
      }
      if(t.value.length > 1) {
        if(first.offset === 0) {
          t.value[0] = {
            offset: 0,
          };
        }
        child.animate.push(t);
      }
      if(v[0]) {
        child.props.style.left = -v[0];
      }
      if(v[1]) {
        child.props.style.top = -v[1];
      }
    }
  }
  if(Array.isArray(opacity) && opacity.length) {
    let t = transformOpacity(opacity, begin2, duration);
    let first = t.value[0];
    if(first.opacity !== 1) {
      child.props.style.opacity = first.opacity;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      child.animate.push(t);
    }
  }
  if(Array.isArray(position2) && position2.length) {
    let t = transformPosition(position2, begin2, duration);
    let first = t.value[0];
    if(first.translateX) {
      child.props.style.translateX = first.translateX;
    }
    if(first.translateY) {
      child.props.style.translateY = first.translateY;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      child.animate.push(t);
    }
  }
  if(Array.isArray(rotateX) && rotateX.length) {
    let t = transformRotateX(rotateX, begin2, duration);
    let first = t.value[0];
    if(first.rotateX) {
      child.props.style.rotateX = first.rotateX;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      child.animate.push(t);
    }
  }
  if(Array.isArray(rotateY) && rotateY.length) {
    let t = transformRotateY(rotateY, begin2, duration);
    let first = t.value[0];
    if(first.rotateY) {
      child.props.style.rotateY = first.rotateY;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      child.animate.push(t);
    }
  }
  if(Array.isArray(rotateZ) && rotateZ.length) {
    let t = transformRotateZ(rotateZ, begin2, duration);
    let first = t.value[0];
    if(first.rotateZ) {
      child.props.style.rotateZ = first.rotateZ;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      child.animate.push(t);
    }
  }
  if(Array.isArray(scale) && scale.length) {
    let t = transformScale(scale, begin2, duration);
    let first = t.value[0];
    if(first.scaleX !== 1) {
      child.props.style.scaleX = first.scaleX;
    }
    if(first.scaleY !== 1) {
      child.props.style.scaleY = first.scaleY;
    }
    if(first.scaleZ !== 1) {
      child.props.style.scaleZ = first.scaleZ;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      child.animate.push(t);
    }
  }
  // 直接children即可，无需library
  res.children = [child];
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
