import {
  transformOrigin,
  transformOpacity,
  transformPosition,
  transformRotateX,
  transformRotateY,
  transformRotateZ,
  transformScale,
  transformPath,
  transformPoints,
  transformFill,
  transformStroke,
  transformStrokeWidth,
  transformLineJoin,
  transformMiterLimit,
  transformSize,
} from './animate';
import path from './path';

/**
 * 预解析父级链接，不递归深入children，返回一个普通的div
 * @param data
 * @param library
 * @param start
 * @param duration
 * @param displayStartTime
 * @param offset
 */
function preParse(data, library, start, duration, displayStartTime, offset) {
  let { name, width, height, inPoint, outPoint, asParent, asChild } = data;
  let begin = start + offset + displayStartTime;
  // 图层在工作区外特殊处理，取最近的一帧内容
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
        // overflow: 'hidden',
      },
    },
    children: [],
    animate: [],
    asParent,
    asChild,
  };
  parseAnimate(res, data, start, duration, displayStartTime, offset, true, false);
  return res;
}

function parseAnimate(res, data, start, duration, displayStartTime, offset, isDirect, isGeom) {
  let { width, height, transform } = data;
  // 分别分析每个变换，过程很相似，当为单帧时需合并到init.style，多帧第一帧需合并且置空
  let { anchorPoint, opacity, position, rotateX, rotateY, rotateZ, scale } = transform;
  let begin2 = start - offset - displayStartTime;
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
      t.value[0] = {
        offset: 0,
      };
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
      t.value[0] = {
        offset: 0,
      };
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
      t.value[0] = {
        offset: 0,
      };
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
      t.value[0] = {
        offset: 0,
      };
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
      t.value[0] = {
        offset: 0,
      };
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
      t.value[0] = {
        offset: 0,
      };
      res.animate.push(t);
      is3d = true;
    }
  }
  if(is3d) {
    // path没有width和height，在处理geom时会添加上
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
      t.value[0] = {
        offset: 0,
      };
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
 * @param displayStartTime
 * @param offset
 * @param parentLink
 */
function recursion(data, library, newLib, start, duration, displayStartTime, offset, parentLink) {
  // 作为父级链接不可见时无需导出
  if(!data.enabled) {
    return null;
  }
  let { name, assetId, startTime, inPoint, outPoint, blendingMode, isMask, isClip } = data;
  if(assetId === undefined || assetId === null) {
    return null;
  }
  let begin = start + offset + displayStartTime;
  inPoint += offset + displayStartTime;
  outPoint += offset + displayStartTime;
  // 图层在工作区外可忽略
  if(inPoint >= begin + duration || outPoint <= begin) {
    return null;
  }
  let res = {
    name,
  };
  res.libraryId = parse(library, assetId, newLib, start, duration, displayStartTime, offset + startTime);
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
        iterations: 1,
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
        offset: inPoint / duration,
        visibility: 'inherit',
        pointerEvents: 'auto',
      });
    }
    else {
      v.value.push({
        offset: 0,
        visibility: 'inherit',
        pointerEvents: 'auto',
      });
    }
    // 结尾计算
    if(outPoint < begin + duration) {
      // 可能是第一帧但offset不为0，不用担心karas会补充空首帧
      v.value.push({
        offset: outPoint / duration,
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
    else {
      v.value.push({
        offset: 1,
        visibility: 'inherit',
        pointerEvents: 'auto',
      });
    }
    res.animate.push(v);
  }
  parseAnimate(res, data, start, duration, displayStartTime, offset, false, false);
  // 父级链接塞进父级作为唯一children，有可能父级是递归嵌套的，需到达最里层
  if(data.hasOwnProperty('asChild')) {
    let asChild = data.asChild;
    if(parentLink.hasOwnProperty(asChild)) {
      let div = JSON.stringify(parentLink[asChild]);
      div = JSON.parse(div);
      let target = div;
      target.asParent = target.asChild = undefined;
      while(target.children.length) {
        target = target.children[0];
        target.asParent = target.asChild = undefined;
      }
      target.children.push(res);
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
 * @param displayStartTime
 * @param offset
 */
function parse(library, assetId, newLib, start, duration, displayStartTime, offset) {
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
        // overflow: 'hidden',
      },
    },
  };
  // 矢量图层特殊解析，添加
  if(geom) {
    parseGeom(res, data, start, duration, displayStartTime, offset);
  }
  else if(text) {
    let content = data.content;
    // $.ae2karas.log(content);
    res.props.style.color = [
      parseInt(content.fillColor[0] * 255),
      parseInt(content.fillColor[1] * 255),
      parseInt(content.fillColor[2] * 255),
    ];
    res.props.style.fontFamily = content.fontFamily;
    res.props.style.fontSize = content.fontSize;
    // res.props.style.fontStyle = content.fontStyle;
    res.props.style.lineHeight = content.leading / content.fontSize;
    res.children = [content.text];
    // 对齐方式
    let baselineLocs = content.baselineLocs;
    if(baselineLocs[0] !== 0) {
      res.props.style.left = baselineLocs[0];
      res.props.style.textAlign = 'center';
    }
    res.props.style.top = -content.fontSize - baselineLocs[1];
  }
  // 图片无children
  else if(type === 'img') {
    res.props.src = src;
  }
  else if(Array.isArray(children)) {
    res.children = [];
    parseChildren(res, children, library, newLib, start, duration, displayStartTime, offset);
  }
  res.id = newLib.length;
  newLib.push(res);
  return res.id;
}

function parseChildren(res, children, library, newLib, start, duration, displayStartTime, offset) {
  if(Array.isArray(children)) {
    // 先一遍解析父级链接，因为父级可能不展示或者只需要父级一层不递归解析父级的children
    let parentLink = {};
    for(let i = 0, len = children.length; i < len; i++) {
      let item = children[i];
      if(item.hasOwnProperty('asParent')) {
        parentLink[item.asParent] = preParse(item, library, start, duration, displayStartTime, offset);
      }
    }
    // 因为父级链接可能产生递归嵌套，需要再循环处理一遍parentLink
    for(let i in parentLink) {
      if(parentLink.hasOwnProperty(i)) {
        let item = parentLink[i];
        let asChild = item.asChild;
        while(asChild !== undefined && parentLink[asChild]) {
          let parent = JSON.stringify(parentLink[asChild]);
          parent = JSON.parse(parent);
          parent.children.push(item);
          item = parent;
          asChild = parent.asChild;
        }
        if(item !== parentLink[i]) {
          parentLink[i] = item;
        }
      }
    }
    // 再普通解析，遇到父级链接特殊处理
    for(let i = 0, len = children.length; i < len; i++) {
      let item = children[i];
      let temp = recursion(item, library, newLib, start, duration, displayStartTime, offset, parentLink);
      if(temp) {
        res.children.push(temp);
        // ppt应该放在父层，如果有父级链接，则放在其上
        if(temp.init && temp.init.style && temp.init.style.perspective) {
          res.props.style.perspective = temp.init.style.perspective || undefined;
          temp.init.style.perspective = undefined;
        }
        if(temp.children && temp.children.length === 1) {
          let t = temp.children[0];
          if(t.init && t.init.style && t.init.style.perspective) {
            temp.props.style.perspective = t.init.style.perspective || undefined;
            t.init.style.perspective = undefined;
          }
        }
        // 有mask分析mask，且要注意如果有父级链接不能直接存入当前children，要下钻一级
        if(item.mask && item.mask.enabled) {
          let m = parseMask(item, temp, start, duration, displayStartTime, offset);
          if(temp.children && temp.children.length === 1) {
            temp.children.push(m);
          }
          else {
            res.children.push(m);
          }
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
 * @param displayStartTime
 * @param offset
 */
function parseGeom(res, data, start, duration, displayStartTime, offset) {
  let { shape: { content, fill, gFill, stroke, transform }, trim } = data;
  let begin2 = start - offset - displayStartTime;
  // 矢量可能有多个，但样式共用一个
  let children = [];
  let len = content.length;
  if(!len) {
    return;
  }
  // 由于动画的特殊性，无法直接用矢量标签，需嵌套一个中间层div
  let child = {
    tagName: 'div',
    props: {
      style: {
        position: 'absolute',
      },
    },
    children,
    animate: [],
  };
  for(let i = 0, len = content.length; i < len; i++) {
    let item = content[i];
    let { type, direction, size, position, roundness, points } = item;
    let f;
    // 由于动画的特殊性，无法直接用矢量标签，需嵌套一个中间层div
    let $geom = {
      tagName: '$polyline',
      props: {
        style: {
          position: 'absolute',
        },
      },
      animate: [],
    };
    children.push($geom);
    // 分类处理矢量
    if(type === 'rect' || type === 'ellipse') {
      let t = transformSize(size, begin2, duration);
      let first = t.value[0];
      $geom.props.style.width = first.size[0];
      $geom.props.style.height = first.size[1];
      if(t.value.length > 1) {
        t.value[0] = {
          offset: 0,
        };
        // 用缩放代替尺寸变化
        for(let i = 1, len = t.value.length; i < len; i++) {
          let item = t.value[i];
          let size = item.size;
          item.size = undefined;
          item.scaleX = size[0] / first.size[0];
          item.scaleY = size[1] / first.size[1];
        }
        $geom.animate.push(t);
      }
      if(type === 'rect') {
        let o = path.rect2polyline(first[0], first[1], roundness);
        $geom.props.points = o.points;
        $geom.props.controls = o.controls;
      }
      else if(type === 'ellipse') {
        let o = path.ellipse2polyline();
        $geom.props.points = o.points;
        $geom.props.controls = o.controls;
      }
    }
    else if(type === 'star') {
      // TODO
    }
    else if(type === 'path') {
      let t = transformPoints(points, begin2, duration);
      let d = t.data;
      // path特殊没尺寸，3d等计算ppt需赋值
      $geom.props.style.width = data.shape.width = d.width;
      $geom.props.style.height = data.shape.height = d.height;
      // path的特殊位置计算，因为ae中尺寸为0
      $geom.props.style.left = d.x2;
      $geom.props.style.top = d.y2;
      t.data = undefined;
      let first = t.value[0];
      $geom.props.points = first.points;
      $geom.props.controls = first.controls;
      if(t.value.length > 1) {
        t.value[0] = {
          offset: 0,
        };
        $geom.animate.push(t);
      }
    }
    // path没有position
    if(position && position.length) {
      let t = transformPosition(position, begin2, duration);
      let first = t.value[0];
      $geom.props.style.translateX = first.translateX;
      $geom.props.style.translateY = first.translateY;
      if(t.value.length > 1) {
        t.value[0] = {
          offset: 0,
        };
        for(let i = 1; i < t.value.length; i++) {
          let item = t.value[i];
          item.translateX -= first.translateX;
          item.translateY -= first.translateY;
        }
        $geom.animate.push(t);
      }
    }
    if(fill && fill.rule === 2 || gFill && gFill.rule === 2) {
      $geom.props.style.fillRule = 'evenodd';
    }
    // geom内嵌的transform单独分析，都作用在中间层div上，anchorPoint比较特殊
    let { anchorPoint } = transform;
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
        let left = $geom.props.style.left;
        let top = $geom.props.style.top;
        $geom.props.style.left -= v[0];
        $geom.props.style.top -= v[1];
        let w = $geom.props.style.width;
        let h = $geom.props.style.height;
        v[0] += w * 0.5;
        v[1] += h * 0.5;
        if(v[0] !== w * 0.5 || v[1] !== h * 0.5) {
          $geom.props.style.transformOrigin = first.transformOrigin;
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
          $geom.animate.push(t);
        }
      }
      else {
        // tfo中心判断，加上尺寸*0.5
        v[0] += $geom.props.style.width * 0.5;
        v[1] += $geom.props.style.height * 0.5;
        if(v[0] !== $geom.props.style.width * 0.5 || v[1] !== $geom.props.style.height * 0.5) {
          $geom.props.style.transformOrigin = first.transformOrigin;
        }
        if(t.value.length > 1) {
          if(first.offset === 0) {
            t.value[0] = {
              offset: 0,
            };
          }
          $geom.animate.push(t);
        }
        if(v[0]) {
          $geom.props.style.left = -v[0];
        }
        if(v[1]) {
          $geom.props.style.top = -v[1];
        }
      }
    }
    parseAnimate(child, data.shape, start, duration, offset, true, true);
    // gradient需要根据transformOrigin来计算
    if(gFill) {
      let transformOrigin = $geom.props.style.transformOrigin;
      let w = $geom.props.style.width, h = $geom.props.style.height;
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
        let x0 = $geom.props.style.translateX || 0, y0 = $geom.props.style.translateY || 0;
        let x1 = start[0] + cx, y1 = start[1] + cy;
        let x2 = end[0] + cx, y2 = end[1] + cy;
        f = `linearGradient(${(x1 - x0) / w} ${(y1 - y0) / h} ${(x2 - x0) / w} ${(y2 - y0)/ h}, #FFF, #000)`;
      }
      else if(type === 2) {
        let x0 = $geom.props.style.translateX || 0, y0 = $geom.props.style.translateY || 0;
        let x1 = start[0] + cx, y1 = start[1] + cy;
        let x2 = end[0] + cx, y2 = end[1] + cy;
        f = `radialGradient(${(x1 - x0) / w} ${(y1 - y0) / h} ${(x2 - x0) / w} ${(y2 - y0)/ h}, #FFF, #000)`;
      }
      $geom.props.style.fill = [f];
    }
    // trimPath裁剪动画或属性
    if(trim && trim.hasOwnProperty('start') && trim.hasOwnProperty('end')) {
      let start = trim.start, end = trim.end;
      if(start.length > 1) {
        let t = transformPath(start, begin2, duration, false);
        let first = t.value[0];
        if(first.start !== 0) {
          $geom.props.start = first.start;
        }
        if(t.value.length > 1) {
          if(first.offset === 0) {
            t.value[0] = {
              offset: 0,
            };
          }
          $geom.animate.push(t);
        }
      }
      else {
        $geom.props.start = start[0] * 0.01;
      }
      if(end.length > 1) {
        let t = transformPath(end, begin2, duration, true);
        let first = t.value[0];
        if(first.end !== 0) {
          $geom.props.end = first.end;
        }
        if(t.value.length > 1) {
          if(first.offset === 0) {
            t.value[0] = {
              offset: 0,
            };
          }
          $geom.animate.push(t);
        }
      }
      else {
        $geom.props.end = end[0] * 0.01;
      }
    }
  }
  if(fill && Array.isArray(fill.color) && fill.color.length) {
    let t = transformFill(fill, begin2, duration);
    let first = t.value[0];
    for(let i = 0; i < len; i++) {
      children[i].props.style.fill = first.fill;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
      };
      for(let i = 0; i < len; i++) {
        children[i].animate.push(t);
      }
    }
  }
  if(stroke && Array.isArray(stroke.color) && stroke.color.length) {
    let t = transformStroke(stroke, begin2, duration);
    let first = t.value[0];
    for(let i = 0; i < len; i++) {
      children[i].props.style.stroke = first.stroke;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
      };
      for(let i = 0; i < len; i++) {
        children[i].animate.push(t);
      }
    }
  }
  if(stroke && Array.isArray(stroke.width) && stroke.width.length) {
    let t = transformStrokeWidth(stroke.width, begin2, duration);
    let first = t.value[0];
    for(let i = 0; i < len; i++) {
      children[i].props.style.strokeWidth = first.strokeWidth;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
      };
      for(let i = 0; i < len; i++) {
        children[i].animate.push(t);
      }
    }
  }
  if(stroke && Array.isArray(stroke.lineJoin) && stroke.lineJoin.length) {
    let t = transformLineJoin(stroke.lineJoin, begin2, duration);
    let first = t.value[0];
    for(let i = 0; i < len; i++) {
      children[i].props.style.strokeLineJoin = first.strokeLineJoin;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
      };
      for(let i = 0; i < len; i++) {
        children[i].animate.push(t);
      }
    }
  }
  if(stroke && Array.isArray(stroke.strokeMiterlimit) && stroke.strokeMiterlimit.length) {
    let t = transformMiterLimit(stroke.strokeMiterlimit, begin2, duration);
    let first = t.value[0];
    for(let i = 0; i < len; i++) {
      children[i].props.style.strokeMiterlimit = first.strokeMiterlimit;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
      };
      for(let i = 0; i < len; i++) {
        children[i].animate.push(t);
      }
    }
  }
  if(stroke && stroke.dashes) {
    for(let i = 0; i < len; i++) {
      children[i].props.style.strokeDasharray = [stroke.dashes];
    }
  }
  if(!stroke) {
    for(let i = 0; i < len; i++) {
      children[i].props.style.strokeWidth = [0];
    }
  }
  res.children = [child];
}

function parseMask(data, target, start, duration, displayStartTime, offset) {
  // $.ae2karas.log(data);
  // $.ae2karas.log(target);
  // 会出现父级链接特殊情况，此时遮罩应该是其唯一children
  if(target.children && target.children.length === 1) {
    target = target.children[0];
  }
  let targetProps = target.init;
  let left = targetProps.style.left || 0;
  let top = targetProps.style.top || 0;
  let res = {
    tagName: '$polyline',
    props: {
      style: {
        position: 'absolute',
        fill: '#FFF',
      },
    },
    animate: [],
  };
  let { width, height, mask: { list: { points, opacity }, mode, inverted } } = data;
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
  // 样式和target一致，只有位置信息需要
  let style = targetProps.style;
  for(let i in style) {
    if(style.hasOwnProperty(i) && ['left', 'top', 'translateX', 'translateY'].indexOf(i) > -1) {
      res.props.style[i] = style[i];
    }
  }
  // 要显示mask，可能会被target同化
  res.props.style.visibility = undefined;
  res.props.style.pointerEvents = undefined;
  // mask的2个动画，points和opacity
  let o = {};
  let begin2 = start - offset - displayStartTime;
  if(Array.isArray(points) && points.length) {
    let t = transformPoints(points, begin2, duration);
    o = t.data;
    res.props.style.width = o.width;
    res.props.style.height = o.height;
    t.data = undefined;
    let first = t.value[0];
    res.props.points = first.points;
    res.props.controls = first.controls;
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
      };
      res.animate.push(t);
    }
  }
  else {
    return res;
  }
  if(Array.isArray(opacity) && opacity.length) {
    let t = transformOpacity(opacity, begin2, duration);
    let first = t.value[0];
    if(first.opacity !== 1) {
      res.props.style.opacity = first.opacity;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
      };
      res.animate.push(t);
    }
  }
  // 获取对象锚点，mask的锚点需保持相同
  let transformOrigin = targetProps.style.transformOrigin;
  let cx = width * 0.5, cy = height * 0.5;
  if(transformOrigin) {
    let v = transformOrigin.split(' ');
    cx = parseFloat(v[0]);
    cy = parseFloat(v[1]);
  }
  // 位置和锚点保持和mask相同，由于points可能不是0，0开始，需计算偏移
  res.props.style.transformOrigin = (cx - o.x2) + ' ' + (cy - o.y2);
  res.props.style.left = left + o.x2;
  res.props.style.top = top + o.y2;
  return res;
}

let uuid = 0;

export default function(data) {
  $.ae2karas.error('convert');
  let { workAreaStart, workAreaDuration, result, library } = data;
  let { name, width, height, children, displayStartTime } = result;
  let newLib = [];
  let res = {
    uuid: uuid++,
    name,
    tagName: 'div',
    props: {
      style: {
        position: 'absolute',
        width,
        height,
        // overflow: 'hidden',
      },
    },
    children: [],
    library: newLib,
    abbr: false,
  };
  parseChildren(res, children, library, newLib, workAreaStart, workAreaDuration, displayStartTime, 0);
  return res;
}
