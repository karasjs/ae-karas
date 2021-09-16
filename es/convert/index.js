import {
  transformOrigin,
  transformOpacity,
  transformPosition,
  transformRotateX,
  transformRotateY,
  transformRotateZ,
  transformScale,
  transformPath,
} from './animate';
import path from './path';

/**
 * 预解析父级链接，不递归深入children，返回一个普通的div
 * @param data
 * @param library
 * @param start
 * @param duration
 * @param offset
 */
function preParse(data, library, start, duration, offset) {
  let { name, width, height, inPoint, outPoint } = data;
  let begin = start + offset;
  // 图层在工作区外特殊处理，取最近的一帧内容 TODO
  if(inPoint >= begin + duration || outPoint <= begin) {
    return null;
  }
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
    children: [],
    animate: [],
  };
  parseAnimate(res, data, start, duration, offset, true, false);
  return res;
}

function parseAnimate(res, data, start, duration, offset, isDirect, isGeom) {
  let { width, height, transform } = data;
  // 分别分析每个变换，过程很相似，当为单帧时需合并到init.style，多帧第一帧需合并且置空
  let { anchorPoint, opacity, position, rotateX, rotateY, rotateZ, scale } = transform;
  let begin2 = start - offset;
  let init = isDirect ? res.props : res.init;
  if(!isGeom && Array.isArray(anchorPoint) && anchorPoint.length) {
    let t = transformOrigin(anchorPoint, begin2, duration);
    let first = t.value[0];
    let v = first.transformOrigin.split(' ');
    v[0] = parseFloat(v[0]);
    v[1] = parseFloat(v[1]);
    if(v[0] !== width * 0.5 || v[1] !== height * 0.5) {
      init.style.transformOrigin = first.transformOrigin;
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
        item.left = -tfo[0];
        item.top = -tfo[1];
      }
      res.animate.push(t);
    }
    // ae中位置相对于anchor，而不是默认左上角原点，因此有个位置计算
    if(v[0]) {
      init.style.left = -v[0];
    }
    if(v[1]) {
      init.style.top = -v[1];
    }
  }
  if(Array.isArray(opacity) && opacity.length) {
    let t = transformOpacity(opacity, begin2, duration);
    let first = t.value[0];
    if(first.opacity !== 1) {
      init.style.opacity = first.opacity;
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
      init.style.translateX = first.translateX;
    }
    if(first.translateY) {
      init.style.translateY = first.translateY;
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
  let is3d;
  if(Array.isArray(rotateX) && rotateX.length) {
    let t = transformRotateX(rotateX, begin2, duration);
    let first = t.value[0];
    if(first.rotateX) {
      init.style.rotateX = first.rotateX;
      is3d = true;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
      is3d = true;
    }
  }
  if(Array.isArray(rotateY) && rotateY.length) {
    let t = transformRotateY(rotateY, begin2, duration);
    let first = t.value[0];
    if(first.rotateY) {
      init.style.rotateY = first.rotateY;
      is3d = true;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
      is3d = true;
    }
  }
  if(Array.isArray(rotateZ) && rotateZ.length) {
    let t = transformRotateZ(rotateZ, begin2, duration);
    let first = t.value[0];
    if(first.rotateZ) {
      init.style.rotateZ = first.rotateZ;
      is3d = true;
    }
    if(t.value.length > 1) {
      if(first.offset === 0) {
        t.value[0] = {
          offset: 0,
        };
      }
      res.animate.push(t);
      is3d = true;
    }
  }
  if(is3d) {
    init.style.perspective = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
  }
  if(Array.isArray(scale) && scale.length) {
    let t = transformScale(scale, begin2, duration);
    let first = t.value[0];
    if(first.scaleX !== 1) {
      init.style.scaleX = first.scaleX;
    }
    if(first.scaleY !== 1) {
      init.style.scaleY = first.scaleY;
    }
    if(first.scaleZ !== 1) {
      init.style.scaleZ = first.scaleZ;
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
 * 动画和初始init部分转换
 * @param data
 * @param library
 * @param newLib
 * @param start
 * @param duration
 * @param offset
 * @param parentLink
 */
function recursion(data, library, newLib, start, duration, offset, parentLink) {
  // 作为父级链接不可见时无需导出
  if(!data.enabled) {
    return null;
  }
  let { name, assetId, startTime, inPoint, outPoint, blendingMode, isMask, isClip } = data;
  if(assetId === undefined || assetId === null) {
    return null;
  }
  let begin = start + offset;
  // 图层在工作区外可忽略
  if(inPoint >= begin + duration || outPoint <= begin) {
    return null;
  }
  let res = {
    name,
  };
  res.libraryId = parse(library, assetId, newLib, start, duration, offset + startTime);
  res.init = {
    style: {},
  };
  // isMask代表是否是遮罩，isClip需在isMask的基础上判断，因为被遮罩层存储isClip值再赋给遮罩层
  if(isMask) {
    if(isClip) {
      res.init.clip = true;
    }
    else {
      res.init.mask = true;
    }
  }
  // 混合模式
  switch(blendingMode) {
    case BlendingMode.MULTIPLY:
      res.init.style.mixBlendMode = 'multiply';
      break;
    case BlendingMode.SCREEN:
      res.init.style.mixBlendMode = 'screen';
      break;
    case BlendingMode.OVERLAY:
      res.init.style.mixBlendMode = 'overlay';
      break;
    case BlendingMode.DARKEN:
      res.init.style.mixBlendMode = 'darken';
      break;
    case BlendingMode.COLOR_DODGE:
      res.init.style.mixBlendMode = 'color-dodge';
      break;
    case BlendingMode.COLOR_BURN:
      res.init.style.mixBlendMode = 'color-burn';
      break;
    case BlendingMode.HARD_LIGHT:
      res.init.style.mixBlendMode = 'hard-light';
      break;
    case BlendingMode.SOFT_LIGHT:
      res.init.style.mixBlendMode = 'soft-light';
      break;
    case BlendingMode.DIFFERENCE:
      res.init.style.mixBlendMode = 'difference';
      break;
    case BlendingMode.EXCLUSION:
      res.init.style.mixBlendMode = 'exclusion';
      break;
    case BlendingMode.HUE:
      res.init.style.mixBlendMode = 'hue';
      break;
    case BlendingMode.SATURATION:
      res.init.style.mixBlendMode = 'saturation';
      break;
    case BlendingMode.COLOR:
      res.init.style.mixBlendMode = 'color';
      break;
    case BlendingMode.LUMINOSITY:
      res.init.style.mixBlendMode = 'luminosity';
      break;
  }
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
  parseAnimate(res, data, start, duration, offset, false, false);
  if(data.hasOwnProperty('asChild')) {
    let asChild = data.asChild;
    if(parentLink.hasOwnProperty(asChild)) {
      let div = JSON.stringify(parentLink[asChild]);
      div = JSON.parse(div);
      div.children.push(res);
      res = div;
    }
  }
  return res;
}

/**
 * 静态部分转换，library中无动画的部分
 * @param library
 * @param assetId
 * @param newLib
 * @param start
 * @param duration
 * @param offset
 */
function parse(library, assetId, newLib, start, duration, offset) {
  let data = library[assetId];
  let { type, name, src, width, height, children, geom, text } = data;
  let res = {
    id: -1, // 占位符
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
  else if(text) {
    let content = data.content;
    res.props.style.color = [
      parseInt(content.fillColor[0] * 255),
      parseInt(content.fillColor[1] * 255),
      parseInt(content.fillColor[2] * 255),
    ];
    res.props.style.fontFamily = content.fontFamily;
    res.props.style.fontSize = content.fontSize;
    res.props.style.fontStyle = content.fontStyle;
    res.props.style.lineHeight = content.leading / content.fontSize;
    res.children = [content.text];
  }
  // 图片无children
  else if(type === 'img') {
    res.props.src = src;
  }
  else if(Array.isArray(children)) {
    res.children = [];
    parseChildren(res, children, library, newLib, start, duration, offset);
  }
  res.id = newLib.length;
  newLib.push(res);
  return res.id;
}

function parseChildren(res, children, library, newLib, start, duration, offset) {
  if(Array.isArray(children)) {
    // 先一遍解析父级链接，因为父级可能不展示或者只需要父级一层不递归解析父级的children
    let parentLink = {};
    for(let i = 0, len = children.length; i < len; i++) {
      let item = children[i];
      if(item.hasOwnProperty('asParent')) {
        parentLink[item.asParent] = preParse(item, library, start, duration, offset);
      }
    }
    // 再普通解析，遇到父级链接特殊处理
    for(let i = 0, len = children.length; i < len; i++) {
      let item = children[i];
      let temp = recursion(item, library, newLib, start, duration, offset, parentLink);
      if(temp) {
        res.children.push(temp);
        // ppt应该放在父层
        if(temp.init && temp.init.style && temp.init.style.perspective) {
          res.props.style.perspective = temp.init.style.perspective;
          temp.init.style.perspective = undefined;
        }
        // 有mask分析mask
        if(item.mask && item.mask.enabled) {
          res.children.push(parseMask(item, temp));
        }
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
  let { shape: { content, fill, gFill, stroke, transform }, trim } = data;
  let { type, direction, size, position, roundness, points } = content;
  let f;
  if(fill) {
    f = [
      parseInt(fill.color[0] * 255),
      parseInt(fill.color[1] * 255),
      parseInt(fill.color[2] * 255),
      fill.color[3]
    ];
    if(fill.opacity !== 100) {
      f[3] *= fill.opacity * 0.01;
    }
  }
  let s;
  if(stroke) {
    s = [
      parseInt(stroke.color[0] * 255),
      parseInt(stroke.color[1] * 255),
      parseInt(stroke.color[2] * 255),
      stroke.color[3]
    ];
    if(stroke.opacity !== 100) {
      s[3] *= stroke.opacity * 0.01;
    }
  }
  let child = {
    tagName: '$polyline',
    props: {
      style: {
        position: 'absolute',
        fill: f ? [f] : undefined,
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
    child.props.style.width = size[0];
    child.props.style.height = size[1];
    let o = path.rect2polyline(size[0], size[1], roundness);
    child.props.points = o.points;
    child.props.controls = o.controls;
  }
  else if(type === 'ellipse') {
    child.props.style.width = size[0];
    child.props.style.height = size[1];
    let o = path.ellipse2polyline();
    child.props.points = o.points;
    child.props.controls = o.controls;
  }
  else if(type === 'star') {
    // TODO
  }
  else if(type === 'path') {
    let { vertices, inTangents, outTangents, closed } = points;
    let o = path.parse(vertices, inTangents, outTangents, closed);
    child.props.style.width = o.width;
    child.props.style.height = o.height;
    child.props.points = o.points
    child.props.controls = o.controls;
    // path的特殊位置计算
    child.props.style.left = o.x2;
    child.props.style.top = o.y2;
  }
  // path没有position
  if(position && position[0]) {
    child.props.style.left = -position[0];
  }
  if(position && position[1]) {
    child.props.style.top = -position[1];
  }
  if(fill && fill.rule === 2 || gFill && gFill.rule === 2) {
    child.props.style.fillRule = 'evenodd';
  }
  // geom内嵌的transform单独分析，anchorPoint比较特殊
  let { anchorPoint } = transform;
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
  parseAnimate(child, data.shape, start, duration, offset, true, true);
  // gradient需要根据transformOrigin来计算
  if(gFill) {
    let transformOrigin = child.props.style.transformOrigin;
    let w = child.props.style.width, h = child.props.style.height;
    let cx, cy;
    if(transformOrigin) {
      transformOrigin = transformOrigin.split(' ');
      cx = parseFloat(transformOrigin[0]);
      cy = parseFloat(transformOrigin[1]);
    }
    else {
      cx = w * 0.5;
      cy = h * 0.5;
    }
    let { type, start, end } = gFill;
    if(type === 1) {
      let x0 = position[0], y0 = position[1];
      let x1 = start[0] + cx, y1 = start[1] + cy;
      let x2 = end[0] + cx, y2 = end[1] + cy;
      f = `linearGradient(${(x1 - x0) / w} ${(y1 - y0) / h} ${(x2 - x0) / w} ${(y2 - y0)/ h}, #FFF, #000)`;
    }
    else if(type === 2) {
      let x0 = position[0], y0 = position[1];
      let x1 = start[0] + cx, y1 = start[1] + cy;
      let x2 = end[0] + cx, y2 = end[1] + cy;
      f = `radialGradient(${(x1 - x0) / w} ${(y1 - y0) / h} ${(x2 - x0) / w} ${(y2 - y0)/ h}, #FFF, #000)`;
    }
    child.props.style.fill = [f];
  }
  // trimPath裁剪动画或属性
  if(trim && trim.hasOwnProperty('start') && trim.hasOwnProperty('end')) {
    let start = trim.start, end = trim.end;
    if(start.length > 1) {
      let t = transformPath(start, begin2, duration, false);
      let first = t.value[0];
      if(first.start !== 0) {
        child.props.start = first.start;
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
    else {
      child.props.start = start[0] * 0.01;
    }
    if(end.length > 1) {
      let t = transformPath(end, begin2, duration, true);
      let first = t.value[0];
      if(first.end !== 0) {
        child.props.end = first.end;
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
    else {
      child.props.end = end[0] * 0.01;
    }
  }
  res.children = [child];
}

function parseMask(data, target) {
  let left = target.init.style.left || 0;
  let top = target.init.style.top || 0;
  let res = {
    tagName: '$polyline',
    props: {
      style: {
        position: 'absolute',
        fill: '#FFF',
      },
    },
  };
  let { width, height, mask: { points, opacity, mode, inverted } } = data;
  if(opacity < 100) {
    res.props.style.opacity = opacity * 0.01;
  }
  // 相加之外都是相减
  if(mode === MaskMode.ADD) {
    if(inverted) {
      res.props.clip = true;
    }
    else {
      res.props.mask = true;
    }
  }
  else {
    if(inverted) {
      res.props.mask = true;
    }
    else {
      res.props.clip = true;
    }
  }
  // 获取对象锚点，mask的锚点需保持相同
  let transformOrigin = target.init.style.transformOrigin;
  let cx = width * 0.5, cy = height * 0.5;
  if(transformOrigin) {
    let v = transformOrigin.split(' ');
    cx = parseFloat(v[0]);
    cy = parseFloat(v[1]);
  }
  let { vertices, inTangents, outTangents, closed } = points;
  let o = path.parse(vertices, inTangents, outTangents, closed);
  res.props.style.width = o.width;
  res.props.style.height = o.height;
  res.props.points = o.points
  res.props.controls = o.controls;
  // 样式和target一致
  let style = target.init.style;
  for(let i in style) {
    if(style.hasOwnProperty(i)) {
      res.props.style[i] = style[i];
    }
  }
  // 位置和锚点保持和mask相同，由于points可能不是0，0开始，需计算偏移
  res.props.style.transformOrigin = (cx - o.x2) + ' ' + (cy - o.y2);
  res.props.style.left = left + o.x2;
  res.props.style.top = top + o.y2;
  return res;
}

export default function(data) {
  $.ae2karas.error('convert');
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
    children: [],
    library: newLib,
    abbr: false,
  };
  parseChildren(res, children, library, newLib, workAreaStart, workAreaDuration, 0);
  return res;
}
