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
  translateXYZ,
} from './animate';
import path from './path';
import camera from './camera';

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
  let { name, width, height, asParent, asChild } = data;
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
  // 父链接不跟随透明度，所以删掉opacity的静态属性
  if(res.props.style.hasOwnProperty('opacity')) {
    delete res.props.style.opacity;
    let animate = res.animate;
    outer:
    for(let i = animate.length - 1; i >= 0; i--) {
      let item = animate[i].value;
      for(let j = 1, len = item.length; j < len; j++) {
        if(item[j].hasOwnProperty('opacity')) {
          animate.splice(i, 1);
          break outer;
        }
      }
    }
  }
  return res;
}

function parseAnimate(res, data, start, duration, displayStartTime, offset, isDirect, isGeom) {
  let { width, height, transform } = data;
  // 分别分析每个变换，过程很相似，当为单帧时需合并到init.style，多帧第一帧需合并且置空
  let { anchorPoint, opacity, position, position_0, position_1, position_2, rotateX, rotateY, rotateZ, scale } = transform;
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
        easing: first.easing,
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
        easing: first.easing,
      };
      res.animate.push(t);
    }
  }
  let is3d;
  // position要考虑x/y/z拆开
  let translateAbbr = true;
  if(Array.isArray(position_0) && position_0.length > 1) {
    translateAbbr = false;
  }
  if(Array.isArray(position_1) && position_1.length > 1) {
    translateAbbr = false;
  }
  if(Array.isArray(position_2) && position_2.length > 1 && res.ddd) {
    translateAbbr = false;
  }
  if(Array.isArray(position) && position.length && translateAbbr) {
    // 需要特殊把translateZ拆开，因为独占一个easing2属性，不能和xy共用
    if(position.length > 1 && res.ddd) {
      let hasZ;
      for(let i = 0, len = position.length; i < len; i++) {
        let item = position[i];
        if(item.value[2] || item.easing2) {
          hasZ = true;
          break;
        }
      }
      let za;
      if(hasZ) {
        za = [];
        for(let i = 0, len = position.length; i < len; i++) {
          let item = position[i];
          let o = {
            time: item.time,
            value: item.value[2],
          };
          if(item.easing2) {
            o.easing = item.easing2;
          }
          za.push(o);
          delete item.easing2;
        }
        let t = translateXYZ(za, begin2, duration, 'translateZ');
        let first = t.value[0];
        if(first.translateZ) {
          init.style.translateZ = first.translateZ;
        }
        if(t.value.length > 1) {
          t.value[0] = {
            offset: 0,
            easing: first.easing,
          };
          res.animate.push(t);
        }
        is3d = true;
      }
    }
    else {
      if(position[0][2] && res.ddd) {
        init.style.translateZ = -position[0][2];
        is3d = true;
      }
    }
    let t = transformPosition(position, begin2, duration);
    let first = t.value[0];
    if(first.translatePath) {
      init.style.translateX = first.translatePath[0];
      init.style.translateY = first.translatePath[1];
    }
    else {
      if(first.translateX) {
        init.style.translateX = first.translateX;
      }
      if(first.translateY) {
        init.style.translateY = first.translateY;
      }
    }
    if(t.value.length > 1) {
      if(!first.translatePath) {
        t.value[0] = {
          offset: 0,
          easing: first.easing,
        };
      }
      res.animate.push(t);
    }
  }
  else {
    if(Array.isArray(position_0) && position_0.length) {
      let t = translateXYZ(position_0, begin2, duration, 'translateX');
      let first = t.value[0];
      if(first.translateX) {
        init.style.translateX = first.translateX;
      }
      if(t.value.length > 1) {
        t.value[0] = {
          offset: 0,
          easing: first.easing,
        };
        res.animate.push(t);
      }
    }
    if(Array.isArray(position_1) && position_1.length) {
      let t = translateXYZ(position_1, begin2, duration, 'translateY');
      let first = t.value[0];
      if(first.translateY) {
        init.style.translateY = first.translateY;
      }
      if(t.value.length > 1) {
        t.value[0] = {
          offset: 0,
          easing: first.easing,
        };
        res.animate.push(t);
      }
    }
    if(Array.isArray(position_2) && position_2.length && res.ddd) {
      let t = translateXYZ(position_2, begin2, duration, 'translateZ');
      let first = t.value[0];
      if(first.translateZ) {
        init.style.translateZ = first.translateZ;
        is3d = true;
      }
      if(t.value.length > 1) {
        t.value[0] = {
          offset: 0,
          easing: first.easing,
        };
        res.animate.push(t);
        is3d = true;
      }
    }
  }
  if(Array.isArray(rotateX) && rotateX.length && res.ddd) {
    let t = transformRotateX(rotateX, begin2, duration);
    let first = t.value[0];
    if(first.rotateX) {
      init.style.rotateX = first.rotateX;
      is3d = true;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
        easing: first.easing,
      };
      res.animate.push(t);
      is3d = true;
    }
  }
  if(Array.isArray(rotateY) && rotateY.length && res.ddd) {
    let t = transformRotateY(rotateY, begin2, duration);
    let first = t.value[0];
    if(first.rotateY) {
      init.style.rotateY = first.rotateY;
      is3d = true;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
        easing: first.easing,
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
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
        easing: first.easing,
      };
      res.animate.push(t);
    }
  }
  if(is3d) {
    // path没有width和height，在处理geom时会添加上
    init.style.perspective = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
  }
  if(Array.isArray(scale) && scale.length) {
    let t = transformScale(scale, begin2, duration, res.ddd);
    let first = t.value[0];
    if(first.scaleX !== 1 && first.scaleX !== undefined && first.scaleX !== null) {
      init.style.scaleX = first.scaleX;
    }
    if(first.scaleY !== 1 && first.scaleY !== undefined && first.scaleY !== null) {
      init.style.scaleY = first.scaleY;
    }
    if(first.scaleZ !== 1 && first.scaleZ !== undefined && first.scaleZ !== null) {
      init.style.scaleZ = first.scaleZ;
    }
    if(t.value.length > 1) {
      t.value[0] = {
        offset: 0,
        easing: first.easing,
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
  let { name, assetId, startTime, inPoint, outPoint, blendingMode, ddd, isCamera, isMask, isClip } = data;
  if(!isCamera && (assetId === undefined || assetId === null)) {
    return null;
  }
  inPoint += offset + displayStartTime;
  outPoint += offset + displayStartTime;
  // 图层在工作区外可忽略
  if(inPoint >= start + duration || outPoint <= start) {
    return null;
  }
  let res = {
    name,
  };
  if(isCamera) {
    res.tagName = 'div';
    res.isCamera = isCamera;
    res.cameraZoom = data.cameraZoom;
    res.cameraDepthOfField = data.cameraDepthOfField;
    res.cameraFocusDistance = data.cameraFocusDistance;
    res.cameraAperture = data.cameraAperture;
    res.cameraBlurLevel = data.cameraBlurLevel;
    res.props = {
      style: {
        display: 'none',
      },
    };
  }
  else {
    if(!newLib[assetId]) {
      parse(library, assetId, newLib, start, duration, displayStartTime, offset + startTime);
    }
    res.libraryId = assetId;
  }
  if(ddd) {
    res.ddd = true;
  }
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
  if(!isCamera) {
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
  }
  res.animate = [];
  // 特殊的visibility动画，如果图层可见在工作区间内，需要有动画，否则可以无视
  if(inPoint > start || outPoint < start + duration) {
    let v = {
      value: [],
      options: {
        duration,
        fill: 'forwards',
        iterations: 1,
      },
    };
    // 开头不可见，默认init的style
    if(inPoint > start) {
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
    if(outPoint < start + duration) {
      // 可能是第一帧但offset不为0，不用担心karas会补充空首帧
      v.value.push({
        offset: outPoint / duration,
        visibility: 'hidden',
        pointerEvents: 'none',
      });
      // 默认不是隐藏需补结束帧为隐藏，否则karas会填补空关键帧
      if(inPoint <= start) {
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
  // text的位置修正，init的left/top会覆盖props的，多嵌套一层也可以但麻烦
  let lib = newLib[res.libraryId];
  if(lib && lib.tagName === 'span') {
    res.init.style.left = res.init.style.left || 0;
    res.init.style.left += lib.props.style.left || 0;
    res.init.style.top = res.init.style.top || 0;
    res.init.style.top += lib.props.style.top || 0;
  }
  // 父级链接塞进父级作为唯一children，有可能父级是递归嵌套的，需到达最里层
  if(data.hasOwnProperty('asChild')) {
    let asChild = data.asChild;
    if(parentLink.hasOwnProperty(asChild)) {
      let div = $.ae2karas.JSON.stringify(parentLink[asChild]);
      div = $.ae2karas.JSON.parse(div);
      let target = div;
      delete target.asParent;
      delete target.asChild;
      while(target.children.length) {
        target = target.children[0];
        delete target.asParent;
        delete target.asChild;
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
        // width,
        // height,
        // overflow: 'hidden',
      },
    },
  };
  if(width) {
    res.props.style.width = width;
  }
  if(height) {
    res.props.style.height = height;
  }
  if(type === 'div' && !geom && !text) {
    res.props.style.overflow = 'hidden';
  }
  // 矢量图层特殊解析，添加
  if(geom) {
    parseGeom(res, data, start, duration, displayStartTime, offset);
  }
  else if(text) {
    let content = data.content;
    if(content.fillColor) {
      res.props.style.color = [
        parseInt(content.fillColor[0] * 255),
        parseInt(content.fillColor[1] * 255),
        parseInt(content.fillColor[2] * 255),
      ];
    }
    else {
      res.props.style.color = 'transparent';
    }
    if(content.stroke && content.strokeWidth) {
      res.props.style.textStrokeColor = [
        parseInt(content.stroke[0] * 255),
        parseInt(content.stroke[1] * 255),
        parseInt(content.stroke[2] * 255),
      ];
      res.props.style.textStrokeWidth = content.strokeWidth;
      if(content.strokeOver) {
        res.props.style.textStrokeOver = 'fill';
      }
    }
    res.props.style.fontFamily = content.fontFamily;
    res.props.style.fontSize = content.fontSize;
    // res.props.style.fontStyle = content.fontStyle;
    // res.props.style.lineHeight = (content.fontSize + content.leading) / content.fontSize;
    res.props.style.lineHeight = 1.2;
    res.children = [content.text];
    // 对齐方式
    let baselineLocs = content.baselineLocs;
    let left = 0, right = 0;
    for(let i = 0, len = baselineLocs.length; i < len; i += 4) {
      left = Math.min(left, baselineLocs[i]);
      right = Math.max(right, baselineLocs[i + 2]);
    }
    if(content.position) {
      res.props.style.left = content.position[0];
      res.props.style.top = content.position[1];
    }
    else {
      if(left) {
        res.props.style.left = left;
        res.props.style.width = right - left;
        res.props.style.textAlign = 'center';
      }
      res.props.style.top = -content.fontSize + baselineLocs[1];
    }
  }
  // 图片无children
  else if(type === 'img') {
    res.props.src = src;
  }
  else if(Array.isArray(children)) {
    res.children = [];
    parseChildren(res, children, library, newLib, start, duration, displayStartTime, offset);
  }
  res.id = assetId;
  newLib[assetId] = res;
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
        while(asChild !== undefined && asChild !== null && parentLink[asChild]) {
          let parent = $.ae2karas.JSON.stringify(parentLink[asChild]);
          parent = $.ae2karas.JSON.parse(parent);
          // 可能出现嵌套，需放在最里层
          let target = parent;
          while(target.children.length) {
            target = target.children[0];
          }
          target.children.push(item);
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
      // 参考线图层跳过
      if(item.guide) {
        continue;
      }
      let temp = recursion(item, library, newLib, start, duration, displayStartTime, offset, parentLink);
      if(temp) {
        res.children.push(temp);
        // ppt应该放在父层，如果有父级链接，则放在其上
        if(temp.init && temp.init.style && temp.init.style.perspective) {
          res.props.style.perspective = temp.init.style.perspective || undefined;
          delete temp.init.style.perspective;
        }
        if(temp.children && temp.children.length === 1) {
          let t = temp.children[0];
          if(t.init && t.init.style && t.init.style.perspective) {
            temp.props.style.perspective = t.init.style.perspective || undefined;
            delete t.init.style.perspective;
          }
        }
        /**
         * 有mask分析mask，特殊的这里有2种mask：
         * 1种是图层自带的mask属性，这时mask是个矢量，它需要跟随本图层的父链接，
         * 因此不能直接存入当前children，要下钻；
         * 2种是TrkMat图层，这时mask可能会是个图片，它不跟随被遮罩图层但可能有自己的父链接
         * 需要将mask标识上移到父链接层
         */
        if(item.mask) {
          // 这种是自带的属性矢量mask
          if(item.mask.enabled) {
            let m = parseMask(item, temp, start, duration, displayStartTime, offset);
            let target = res;
            while(temp.children && temp.children.length === 1) {
              target = temp;
              temp = temp.children[0];
            }
            let prev = target.children[target.children.length - 1];
            // 特殊的地方，被遮罩的可能有init样式，mask需同等赋值，位置锚点会有冲突其它不会
            let style = prev.init.style;
            let mStyle = m.props.style;
            if(style) {
              for(let i in style) {
                if(style.hasOwnProperty(i) && {
                  'scaleX': true,
                  'scaleY': true,
                  'scaleZ': true,
                  'rotateZ': true,
                }.hasOwnProperty(i)) {
                  mStyle[i] = style[i];
                }
              }
            }
            let a = prev.animate;
            // mask本身会有动画，还会继承同层被遮罩的位置锚点的动画，不能直接赋予，需计算每帧差值应用过来
            if(a && a.length) {
              m.animate = m.animate || [];
              for(let i = 0, len = a.length; i < len; i++) {
                let item = a[i], value = item.value, value1 = value[1];
                // tfo和left/top是一起的，可直接计算
                if(value1.hasOwnProperty('transformOrigin')) {
                  let tfo = {
                    value: [{
                      offset: 0,
                    }],
                    options: item.options,
                  };
                  if(value[0].hasOwnProperty('easing')) {
                    tfo.value[0].easing = value[0].easing;
                  }
                  let arr = mStyle.transformOrigin.split(' ');
                  arr[0] = parseFloat(arr[0]);
                  arr[1] = parseFloat(arr[1]);
                  for(let j = 1, len2 = value.length; j < len2; j++) {
                    let item2 = value[j];
                    let diffX = item2.left - (style.left || 0);
                    let diffY = item2.top - (style.top || 0);
                    let arr2 = [arr[0] - diffX, arr[1] - diffY];
                    let o = {
                      offset: item2.offset,
                      left: mStyle.left + diffX,
                      top: mStyle.top + diffY,
                      transformOrigin: arr2.join(' '),
                    };
                    if(item2.hasOwnProperty('easing')) {
                      o.easing = item2.easing;
                    }
                    tfo.value.push(o);
                  }
                  m.animate.push(tfo);
                }
                else if(value1.hasOwnProperty('translatePath')
                  || value1.hasOwnProperty('translateX')
                  || value1.hasOwnProperty('translateY')
                  || value1.hasOwnProperty('translateZ')) {
                  m.animate.push(JSON.parse(JSON.stringify(item)));
                }
              }
            }
            target.children.push(m);
          }
          // 另外这种是独立mask图层，看有无嵌套，有则提升mask属性
          else {
            let needFix;
            // 嵌套都是父级只有props不会出现init
            if(temp.props) {
              if(temp.props.mask || temp.props.clip) {}
              else {
                needFix = true;
              }
            }
            if(needFix) {
              let child = temp;
              while(child.children && child.children[0]) {
                child = child.children[0];
              }
              if(child.init && (child.init.mask || child.init.clip)) {
                if(child.init.mask) {
                  delete child.init.mask;
                  temp.props.mask = true;
                }
                else {
                  delete child.props.mask;
                  temp.props.clip = true;
                }
              }
            }
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
        let o = path.rect2polyline(first.size[0], first.size[1], roundness[0]);
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
      $geom.props.style.translateZ = first.translateZ;
      if(t.value.length > 1) {
        t.value[0] = {
          offset: 0,
        };
        for(let i = 1; i < t.value.length; i++) {
          let item = t.value[i];
          item.translateX -= first.translateX;
          item.translateY -= first.translateY;
          item.translateZ -= first.translateZ;
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
      let { type, start, end, colors: { m, p } } = gFill;
      let steps = '';
      for(let i = 0; i < p; i++) {
        if(i) {
          steps += ', ';
        }
        steps += 'rgba(' + Math.floor(m[i * 4 + 1] * 255);
        steps += ',' + Math.floor(m[i * 4 + 2] * 255);
        steps += ',' + Math.floor(m[i * 4 + 3] * 255);
        // 可能有透明度
        if(m.length >= p * 4 + (i + 1) * 2) {
          steps += ',' + m[p * 4 + (i + 1) * 2 - 1];
        }
        else {
          steps += ',1';
        }
        steps += ') ';
        steps += m[i * 4] * 100 + '%';
      }
      if(!steps) {
        steps = '#F00, #00F';
      }
      if(type === 1) {
        let x0 = $geom.props.style.translateX || 0, y0 = $geom.props.style.translateY || 0;
        let x1 = start[0] + cx, y1 = start[1] + cy;
        let x2 = end[0] + cx, y2 = end[1] + cy;
        f = `linearGradient(${(x1 - x0) / w} ${(y1 - y0) / h} ${(x2 - x0) / w} ${(y2 - y0)/ h}, ${steps})`;
      }
      else if(type === 2) {
        let x0 = $geom.props.style.translateX || 0, y0 = $geom.props.style.translateY || 0;
        let x1 = start[0] + cx, y1 = start[1] + cy;
        let x2 = end[0] + cx, y2 = end[1] + cy;
        f = `radialGradient(${(x1 - x0) / w} ${(y1 - y0) / h} ${(x2 - x0) / w} ${(y2 - y0)/ h}, ${steps})`;
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
  while(target.children && target.children.length === 1) {
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
  // 样式和target一致，只有位置信息需要，锚点单独处理
  let style = targetProps.style;
  for(let i in style) {
    if(style.hasOwnProperty(i) && ['left', 'top', 'translateX', 'translateY', 'translateZ'].indexOf(i) > -1) {
      res.props.style[i] = style[i];
    }
  }
  // 要显示mask，可能会被target同化
  delete res.props.style.visibility;
  delete res.props.style.pointerEvents;
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

function recursionId(data, map) {
  if(data.hasOwnProperty('libraryId')) {
    if(map.hasOwnProperty(data.libraryId)) {
      data.libraryId = map[data.libraryId];
    }
  }
  let children = data.children;
  if(Array.isArray(children)) {
    for(let i = 0, len = children.length; i < len; i++) {
      recursionId(children[i], map);
    }
  }
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
  // library可能出现null，需排除，然后要把id重新映射一下
  let map = {}, count = 0, ol = newLib.length;
  for(let i = 0, len = newLib.length; i < len; i++) {
    let item = newLib[i];
    if(item) {
      let nid = count;
      map[item.id] = count++;
      item.id = nid;
    }
    else {
      newLib.splice(i, 1);
      i--;
      len--;
    }
  }
  if(ol > newLib.length) {
    recursionId(res, map);
    for(let i = 0, len = newLib.length; i < len; i++) {
      recursionId(newLib[i], map);
    }
  }
  // 检查直接孩子中的camera，删除并转换为3d
  let cd = res.children;
  for(let i = 0, len = cd.length; i < len; i++) {
    let child = cd[i];
    if(child.isCamera) {
      let cameraData = {
        name: child.name,
        cameraZoom: child.cameraZoom,
        cameraDepthOfField: child.cameraDepthOfField,
        cameraFocusDistance: child.cameraFocusDistance,
        cameraAperture: child.cameraAperture,
        cameraBlurLevel: child.cameraBlurLevel,
        init: child.init,
        animate: child.animate,
      };
      cd.splice(i, 1);
      camera(cameraData, res);
      break;
    }
  }
  return res;
}
