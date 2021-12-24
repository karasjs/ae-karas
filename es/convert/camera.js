import { r2d, sliceBezier } from '../math';
import easing from '../easing';

function getOffset(offsetList, offsetHash, list, key) {
  for(let i = 0, len = list.length; i < len; i++) {
    let item = list[i].value;
    let item2 = item[1];
    if(!item2.hasOwnProperty(key)) {
      continue;
    }
    for(let j = 1, len2 = item.length; j < len2; j++) {
      let offset = item[j].offset;
      if(!offsetHash.hasOwnProperty(offset)) {
        offsetList.push(offset);
        offsetHash[offset] = true;
      }
    }
  }
}

function insertKf(offsetList, offsetHash, list, style, key) {
  let length = offsetList.length;
  for(let i = 0, len = list.length; i < len; i++) {
    let item = list[i].value;
    let item2 = item[1];
    if(!item2.hasOwnProperty(key)) {
      continue;
    }
    for(let j = 1; j < length - 1; j++) {
      if(item[j].offset !== offsetList[j]) {
        let prev = item[j - 1], next = item[j];
        let percent = (offsetList[j] - prev.offset) / (next.offset - prev.offset);
        let ea = prev.easing;
        let p = percent;
        if(ea) {
          p = easing.getEasing(ea)(percent);
        }
        let obj = {
          offset: offsetList[j],
        };
        if(ea) {
          let points = sliceBezier([
            [0, 0],
            [ea[0], ea[1]],
            [ea[2], ea[3]],
            [1, 1],
          ], percent);
          prev.easing = [
            points[1][0] / points[3][0],
            points[1][1] / points[3][1],
            points[2][0] / points[3][0],
            points[2][1] / points[3][1],
          ];
          points = sliceBezier([
            [0, 0],
            [ea[0], ea[1]],
            [ea[2], ea[3]],
            [1, 1],
          ].reverse(), 1 - percent).reverse();
          let x = 1 - points[0][0], y = 1 - points[0][1];
          obj.easing = [
            (points[1][0] - points[0][0]) / x,
            (points[1][1] - points[0][1]) / y,
            (points[2][0] - points[0][0]) / x,
            (points[2][1] - points[0][1]) / y,
          ];
        }
        let pv = j === 1 ? (style[key] || '') : (prev[key] || '');
        let nv = next[key] || '';
        if(key === 'transformOrigin') {
          pv = pv.split(' ');
          pv[0] = parseFloat(pv[0]) || 0;
          pv[1] = parseFloat(pv[1]) || 0;
          pv[2] = parseFloat(pv[2]) || 0;
          nv = nv.split(' ');
          nv[0] = parseFloat(nv[0]) || 0;
          nv[1] = parseFloat(nv[1]) || 0;
          nv[2] = parseFloat(nv[2]) || 0;
          let diff = [
            nv[0] - pv[0],
            nv[1] - pv[1],
            nv[2] - pv[2],
          ];
          obj[key] = (pv[0] + diff[0] * p)
            + ' ' + (pv[1] + diff[1] * p)
            + ' ' + (pv[2] + diff[2] * p);
        }
        // 这3个key可能同时出现在一帧里
        else if(key === 'translateX' || key === 'translateY' || key === 'translateZ') {
          let diff = (nv || 0) - (pv || 0);
          obj[key] = (pv || 0) + diff * p;
          let arr = ['translateX', 'translateY', 'translateZ'];
          for(let m = 0; m < 3; m++) {
            let k = arr[m];
            if(k !== key && (prev.hasOwnProperty(k) || next.hasOwnProperty(k))) {
              let pv = j === 1 ? (style[k] || 0) : (prev[k] || 0);
              let diff = (next[k] || 0) - pv;
              obj[k] = pv + diff * p;
            }
          }
        }
        else if(key === 'rotateX' || key === 'rotateY' || key === 'rotateZ') {
          let diff = (nv || 0) - ( pv || 0);
          obj[key] = (pv || 0) + diff * p;
        }
        item.splice(j, 0, obj);
      }
    }
  }
}

function getPerspectiveAndScale(data, index) {
  let look, eyeX, eyeY, eyeZ, lookX, lookY, lookZ;
  // 可能缺省和init一样，所以先赋值，首帧也是init
  look = (data.init.style.transformOrigin || '').split(' ');
  eyeX = data.init.style.translateX || 0;
  eyeY = data.init.style.translateY || 0;
  eyeZ = data.init.style.translateZ || 0;
  // animate取
  if(index) {
    let animate = data.animate;
    for(let i = 0, len = animate.length; i < len; i++) {
      let item = animate[i].value[index];
      if(item.hasOwnProperty('transformOrigin')) {
        look = (item.transformOrigin || '').split(' ');
      }
      else if(item.hasOwnProperty('translateX')
        || item.hasOwnProperty('translateY')
        || item.hasOwnProperty('translateZ')) {
        if(item.hasOwnProperty('translateX')) {
          eyeX = item.translateX;
        }
        if(item.hasOwnProperty('translateY')) {
          eyeY = item.translateY;
        }
        if(item.hasOwnProperty('translateZ')) {
          eyeZ = item.translateZ;
        }
      }
    }
  }
  lookX = parseFloat(look[0]) || 0;
  lookY = parseFloat(look[1]) || 0;
  lookZ = parseFloat(look[2]) || 0;
  let perspective = Math.floor(Math.sqrt(Math.pow(eyeX - lookX, 2) + Math.pow(eyeY - lookY, 2) + Math.pow(eyeZ - lookZ, 2)));
  let scale = Math.floor(data.cameraZoom) / perspective;
  // $.ae2karas.log('perspective: ' + perspective + ', zoom: ' + data.cameraZoom);
  return {
    eyeX,
    eyeY,
    eyeZ,
    lookX,
    lookY,
    lookZ,
    perspective,
    scale,
  };
}

function setTranslateAndRotate(w, h, child, index, offsetList, duration, eyeX, eyeY, eyeZ, lookX, lookY, lookZ) {
  let style = child.init.style;
  // 可能缺省和init一样，所以先赋值，首帧也是init
  let tfo = (style.transformOrigin || '').split(' ');
  let tx = style.translateX || 0, ty = style.translateY || 0, tz = style.translateZ || 0;
  let animate = child.animate;
  // 非首帧从animate取
  if(index) {
    for(let i = 0, len = animate.length; i < len; i++) {
      let item = animate[i].value[index];
      // 没有的话说明没有执行统一插帧操作，不是需要考虑的变换属性
      if(!item) {
        continue;
      }
      if(item.hasOwnProperty('transformOrigin')) {
        tfo = (item.transformOrigin || '').split(' ');
      }
      else if(item.hasOwnProperty('translateX')
        || item.hasOwnProperty('translateY')
        || item.hasOwnProperty('translateZ')) {
        if(item.hasOwnProperty('translateX')) {
          tx = item.translateX;
        }
        if(item.hasOwnProperty('translateY')) {
          ty = item.translateY;
        }
        if(item.hasOwnProperty('translateZ')) {
          tz = item.translateZ;
        }
      }
    }
  }
  let x = (style.left || 0) + parseFloat(tfo[0]) || 0;
  let y = (style.top || 0) + parseFloat(tfo[1]) || 0;
  let z = parseFloat(tfo[2]) || 0;
  x += tx;
  y += ty;
  z += tz;
  // $.ae2karas.warn(eyeX + ',' + eyeY + ',' + eyeZ + '; ' + lookX + ',' + lookY + ',' + lookZ);
  // $.ae2karas.log({ x, y, z });
  let o = convert(w, h, eyeX, eyeY, eyeZ, lookX, lookY, lookZ, { x, y, z });
  // $.ae2karas.log(o);
  // 也是区分首帧和其它
  if(index) {
    for(let i = 0, len = animate.length; i < len; i++) {
      let item = animate[i].value[index];
      // 没有的话说明没有执行统一插帧操作，不是需要考虑的变换属性
      if(!item) {
        continue;
      }
      if(item.hasOwnProperty('translateX')
        || item.hasOwnProperty('translateY')
        || item.hasOwnProperty('translateZ')) {
        if(item.hasOwnProperty('translateX')) {
          item.translateX += o.translateX;
        }
        if(item.hasOwnProperty('translateY')) {
          item.translateY += o.translateY;
        }
        // 特殊直接赋值
        if(item.hasOwnProperty('translateZ')) {
          item.translateZ = o.translateZ;
        }
      }
      else if(item.hasOwnProperty('rotateX')) {
        item.rotateX += o.rotateX;
      }
      else if(item.hasOwnProperty('rotateY')) {
        item.rotateY += o.rotateY;
      }
    }
  }
  else {
    // 需要临时保存最初值，因为变换后的保存在style上会覆盖掉
    let temp = {
      translateX: style.translateX || 0,
      translateY: style.translateY || 0,
      translateZ: style.translateZ || 0,
      rotateX: style.rotateX || 0,
      rotateY: style.rotateY || 0,
    };
    style.rotateX = style.rotateX || 0;
    style.rotateX += o.rotateX;
    style.rotateY = style.rotateY || 0;
    style.rotateY += o.rotateY;
    style.translateX = style.translateX || 0;
    style.translateX += o.translateX;
    style.translateY = style.translateY || 0;
    style.translateY += o.translateY;
    style.translateZ = o.translateZ;
    // 需要特殊处理，可能这个child没有translate、rotate动画，需要加上，可能白加无所谓，交给压缩去除
    let record = {};
    outer:
    for(let i = 0, len = animate.length; i < len; i++) {
      let item = animate[i].value;
      for(let j = 0, len2 = item.length; j < len2; j++) {
        let item2 = item[j];
        if(item2.hasOwnProperty('translateX')) {
          record.translateX = true;
        }
        if(item2.hasOwnProperty('translateY')) {
          record.translateY = true;
        }
        if(item2.hasOwnProperty('translateZ')) {
          record.translateZ = true;
        }
        if(item2.hasOwnProperty('rotateX')) {
          record.rotateX = true;
        }
        if(item2.hasOwnProperty('rotateY')) {
          record.rotateY = true;
        }
        if(record.translateX && record.translateY && record.translateZ && record.rotateX && record.rotateY) {
          break outer;
        }
      }
    }
    // $.ae2karas.log(JSON.stringify(animate));
    // $.ae2karas.log(record);
    // $.ae2karas.log(temp);
    let list = ['translateX', 'translateY', 'translateZ', 'rotateX', 'rotateY'];
    for(let i = 0, len = list.length; i < len; i++) {
      let k = list[i];
      if(!record[k]) {
        let item = {
          value: [{
            offset: 0,
          }],
          options: {
            duration,
            fill: 'forwards',
            iterations: 1,
          },
        }
        for(let j = 1, len2 = offsetList.length; j < len2; j++) {
          let o = {
            offset: offsetList[j],
          };
          o[k] = temp[k] || 0;
          item.value.push(o);
        }
        animate.push(item);
      }
    }
  }
}

function convert(w, h, eyeX, eyeY, eyeZ, lookX, lookY, lookZ, data) {
  let cx = w * 0.5;
  let cy = h * 0.5;
  let x = convertX(cx, eyeX, eyeZ, lookX, lookZ, data);
  let y = convertY(cy, eyeY, eyeZ, lookY, lookZ, data);
  let a = eyeX - lookX, b = eyeY - lookY, c = eyeZ - lookZ, d = -a * lookX - b * lookY - c * lookZ;
  // $.ae2karas.log('a: ' + a + ', b: ' + b + ', c: ' + c + ', d: ' + d);
  let translateZ = (data.x * a + data.y * b + data.z * c + d) / Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2) + Math.pow(c, 2));
  return {
    rotateX: y.rotateX,
    rotateY: -x.rotateY,
    translateX: x.translateX,
    translateY: y.translateY,
    translateZ,
  };
}

// 顶视图往下看，左到右为x，上到下为z，朝向为y
function convertX(cx, eyeX, eyeZ, lookX, lookZ, data) {
  // 特殊情况
  if(eyeX === lookX && cx === eyeX) {
    return {
      rotateY: 0,
      translateX: 0,
    };
  }
  let tan = (eyeX - lookX) / (eyeZ - lookZ);
  let alpha = Math.atan(tan);
  let sin = Math.sin(alpha);
  let cos = Math.cos(alpha);
  let bd = (data.z - lookZ);
  let ab = bd / sin;
  let ad = bd / tan;
  let ag = ad + (data.x - lookX);
  let ac = cos * ag;
  let bc = ac - ab;
  let tx = bc - (data.x - cx);
  return {
    rotateY: r2d(alpha),
    translateX: tx,
  };
}

// 左视图往右看，左到右为z，下到上为y，朝向为x
function convertY(cy, eyeY, eyeZ, lookY, lookZ, data) {
  // 特殊情况
  if(eyeY === lookY && cy === eyeY) {
    return {
      rotateX: 0,
      translateY: 0,
    };
  }
  let tan = (eyeY - lookY) / (eyeZ - lookZ);
  let alpha = Math.atan(tan);
  let sin = Math.sin(alpha);
  let cos = Math.cos(alpha);
  let bd = (data.z - lookZ);
  let ab = bd / sin;
  let ad = bd / tan;
  let ag = ad + (data.y - lookY);
  let ac = cos * ag;
  let bc = ac - ab;
  let ty = bc - (data.y - cy);
  return {
    rotateX: r2d(alpha),
    translateY: ty,
  };
}

export default function(data, res) {
  $.ae2karas.error('camera');
  // $.ae2karas.log(JSON.stringify(res));
  let children = res.children;
  // 时长
  let duration = 0;
  if(data.animate.length) {
    duration = data.animate[0].options.duration;
  }
  else {
    for(let i = 0, len = children.length; i < len; i++) {
      let child = children[i];
      if(child.animate.length) {
        duration = child.animate[0].options.duration;
        break;
      }
    }
  }
  // 求出camera的tfo/translate动画的关键帧时间和所有children的tfo/translate/rotate的合集
  let offsetList = [0], offsetHash = { 0: true };
  getOffset(offsetList, offsetHash, data.animate, 'transformOrigin');
  getOffset(offsetList, offsetHash, data.animate, 'translateX');
  getOffset(offsetList, offsetHash, data.animate, 'translateY');
  getOffset(offsetList, offsetHash, data.animate, 'translateZ');
  for(let i = 0, len = children.length; i < len; i++) {
    let child = children[i];
    getOffset(offsetList, offsetHash, child.animate, 'transformOrigin');
    getOffset(offsetList, offsetHash, child.animate, 'translateX');
    getOffset(offsetList, offsetHash, child.animate, 'translateY');
    getOffset(offsetList, offsetHash, child.animate, 'translateZ');
    getOffset(offsetList, offsetHash, child.animate, 'rotateX');
    getOffset(offsetList, offsetHash, child.animate, 'rotateY');
  }
  offsetList.sort(function(a, b) {
    return a - b;
  });
  $.ae2karas.warn(offsetList);
  // 为不存在于offset合集的动画插入中间关键帧
  insertKf(offsetList, offsetHash, data.animate, data.init.style, 'transformOrigin');
  insertKf(offsetList, offsetHash, data.animate, data.init.style, 'translateX');
  insertKf(offsetList, offsetHash, data.animate, data.init.style, 'translateY');
  insertKf(offsetList, offsetHash, data.animate, data.init.style, 'translateZ');
  for(let i = 0, len = children.length; i < len; i++) {
    let child = children[i];
    // 只有3d图层需要
    if(child.ddd) {
      insertKf(offsetList, offsetHash, child.animate, child.init.style, 'transformOrigin');
      insertKf(offsetList, offsetHash, child.animate, child.init.style, 'translateX');
      insertKf(offsetList, offsetHash, child.animate, child.init.style, 'translateY');
      insertKf(offsetList, offsetHash, child.animate, child.init.style, 'translateZ');
      insertKf(offsetList, offsetHash, child.animate, child.init.style, 'rotateX');
      insertKf(offsetList, offsetHash, child.animate, child.init.style, 'rotateY');
      insertKf(offsetList, offsetHash, child.animate, child.init.style, 'rotateZ');
    }
  }
  let w = res.props.style.width, h = res.props.style.height;
  // 计算每帧的perspective，存入动画，scale是AE固定焦距导致的缩放
  let rootAnimate = [];
  for(let i = 0, len = offsetList.length; i < len; i++) {
    let { eyeX, eyeY, eyeZ, lookX, lookY, lookZ, perspective, scale } = getPerspectiveAndScale(data, i);
    // 非首帧
    if(i) {
      rootAnimate.push({
        offset: offsetList[i],
        perspective,
        scale,
      });
    }
    // 首帧填空
    else {
      rootAnimate.push({
        offset: 0,
      });
      res.props.style.perspective = perspective;
      if(scale !== 1) {
        res.props.style.scale = scale;
      }
    }
    for(let j = 0, len2 = children.length; j < len2; j++) {
      let child = children[j];
      if(child.ddd) {
        setTranslateAndRotate(w, h, child, i, offsetList, duration, eyeX, eyeY, eyeZ, lookX, lookY, lookZ);
      }
      else {
        //
      }
    }
  }
  // 特殊插入zIndex，值等同于translateZ
  for(let i = 0, len = children.length; i < len; i++) {
    let child = children[i];
    if(!child.ddd) {
      continue;
    }
    let style = child.init.style;
    let animate = child.animate;
    if(style.translateZ) {
      style.zIndex = style.translateZ;
    }
    let zIndex = [];
    for(let j = 0, len2 = offsetList.length; j < len2; j++) {
      if(j) {
        let has;
        for(let k = 0, len3 = animate.length; k < len3; k++) {
          let item = animate[k];
          let item2 = item.value[j];
          if(item2.hasOwnProperty('translateZ')) {
            zIndex.push({
              offset: offsetList[j],
              zIndex: item2.translateZ,
            });
            has = true;
            break;
          }
        }
        if(!has) {
          zIndex.push({
            offset: offsetList[j],
          });
        }
      }
      else {
        zIndex.push({
          offset: 0,
        });
      }
    }
    child.animate.push({
      value: zIndex,
      options: {
        duration,
        iterations: 1,
        fill: 'forwards',
      },
    });
  }
  if(rootAnimate.length > 1) {
    res.animate = [
      {
        value: rootAnimate,
        options: {
          duration,
          fill: 'forwards',
          iterations: 1,
        },
      },
    ];
  }
};
