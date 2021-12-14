import { r2d, sliceBezier, sliceBezier2Both } from '../math';
import easing from '../easing';

function convert(W, H, eyeX, eyeY, eyeZ, lookX, lookY, lookZ, data) {
  let cx = W * 0.5;
  let cy = H * 0.5;
  let x = convertX(cx, eyeX, eyeZ, lookX, lookZ, data);
  // console.log(x);
  let y = convertY(cy, eyeY, eyeZ, lookY, lookZ, data);
  // console.log(y);
  let ppt = Math.sqrt(Math.pow(eyeX - lookX, 2) + Math.pow(eyeY - lookY, 2) + Math.pow(eyeZ - lookZ, 2));
  // console.log('ppt', ppt);
  // let nv = [eyeX - lookX, eyeY - lookY, eyeZ - lookZ];
  // console.log('nv', nv);
  let a = eyeX - lookX, b = eyeY - lookY, c = eyeZ - lookZ, d = -a * lookX - b * lookY - c * lookZ;
  // console.log('a', a, 'b', b, 'c', c, 'd', d);
  let tz = (data.x * a + data.y * b + data.z * c + d) / Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2) + Math.pow(c, 2));
  // console.log('tz', tz);
  return {
    rotateY: -x.rotateY,
    translateX: x.translateX,
    rotateX: y.rotateX,
    translateY: y.translateY,
    tz,
  };
}

// 顶视图往下看，左到右为x，上到下为z，朝向为y
function convertX(cx, eyeX, eyeZ, lookX, lookZ, data) {
  // 特殊情况
  if(eyeX === lookX && cx === eyeX) {
    return {
      rotateY: 0,
      translateX: 0,
      translateZ: data.z - lookZ,
    };
  }
  let tan = (eyeX - lookX) / (eyeZ - lookZ);
  let alpha = Math.atan(tan);
  let sin = Math.sin(alpha);
  let cos = Math.cos(alpha);
  // console.log('alpha', alpha, karas.math.geom.r2d(alpha));
  let bd = (data.z - lookZ);
  // console.log('bd', bd);
  let ab = bd / sin;
  // console.log('ab', ab);
  let ad = bd / tan;
  // console.log('ad', ad);
  let ag = ad + (data.x - lookX);
  // console.log('ag', ag);
  let ac = cos * ag;
  // console.log('ac', ac);
  let bc = ac - ab;
  // console.log('bc', bc);
  let tx = bc - (data.x - cx);
  // console.log('tx', tx);
  // let tz = tan * ac;
  // console.log('cg as tz', tz);
  return {
    rotateY: karas.math.geom.r2d(alpha),
    translateX: tx,
    // translateZ: tz,
  };
}

// 左视图往右看，左到右为z，下到上为y，朝向为x
function convertY(cy, eyeY, eyeZ, lookY, lookZ, data) {
  // 特殊情况
  if(eyeY === lookY && cy === eyeY) {
    return {
      rotateX: 0,
      translateY: 0,
      translateZ: data.z - lookZ,
    };
  }
  let tan = (eyeY - lookY) / (eyeZ - lookZ);
  let alpha = Math.atan(tan);
  let sin = Math.sin(alpha);
  let cos = Math.cos(alpha);
  // console.log('alpha', alpha, karas.math.geom.r2d(alpha));
  let bd = (data.z - lookZ);
  // console.log('bd', bd);
  let ab = bd / sin;
  // console.log('ab', ab);
  let ad = bd / tan;
  // console.log('ad', ad);
  let ag = ad + (data.y - lookY);
  // console.log('ag', ag);
  let ac = cos * ag;
  // console.log('ac', ac);
  let bc = ac - ab;
  // console.log('bc', bc);
  let ty = bc - (data.y - cy);
  // console.log('ty', ty);
  // let tz = tan * ac;
  // console.log('cg as tz', tz);
  return {
    rotateX: karas.math.geom.r2d(alpha),
    translateY: ty,
    // translateZ: tz,
  };
}

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
        if(ea) {
          percent = easing.getEasing(ea)(percent);
        }
        let obj = {
          offset: offsetList[j],
        };
        if(ea) {
          // TODO
        }
        let pv = j === 1 ? style[key] : prev[key];
        let nv = next[key];
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
          obj[key] = (pv[0] + diff[0] * percent)
            + ' ' + (pv[1] + diff[1] * percent)
            + ' ' + (pv[2] + diff[2] * percent);
        }
        // 这3个key可能同时出现在一帧里
        else if(key === 'translateX' || key === 'translateY' || key === 'translateZ') {
          let diff = (nv || 0) - ( pv || 0);
          obj[key] = (pv || 0) + diff * percent;
          let arr = ['translateX', 'translateY', 'translateZ'];
          for(let m = 0; m < 3; m++) {
            let k = arr[m];
            if(k !== 'key' && (prev.hasOwnProperty(k) || next.hasOwnProperty(k))) {
              let diff = (next[k] || 0) - (prev[k] || 0);
              obj[k] = (prev[k] || 0) + diff * percent;
            }
          }
        }
        else if(key === 'rotateX' || key === 'rotateY' || key === 'rotateZ') {
          let diff = (nv || 0) - ( pv || 0);
          obj[key] = (pv || 0) + diff * percent;
        }
        item.splice(j, 0, obj);
      }
    }
  }
}

export default function(data, res) {
  let children = res.children;
  // 为根节点和所有children之间新增一个perspective层，和画布同尺寸
  let div = {
    tagName: 'div',
    props: {
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
      },
    },
  };
  // camera忽略掉所有曲线easing和translatePath，translatePath要转换
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
    getOffset(offsetList, offsetHash, child.animate, 'rotateZ');
  }
  offsetList.sort(function(a, b) {
    return a - b;
  });
  // $.ae2karas.log(offsetList);
  // 为不存在于offset合集的动画插入中间关键帧
  insertKf(offsetList, offsetHash, data.animate, data.init.style, 'transformOrigin');
  insertKf(offsetList, offsetHash, data.animate, data.init.style, 'translateX');
  insertKf(offsetList, offsetHash, data.animate, data.init.style, 'translateY');
  insertKf(offsetList, offsetHash, data.animate, data.init.style, 'translateZ');
  for(let i = 0, len = children.length; i < len; i++) {
    let child = children[i];
    insertKf(offsetList, offsetHash, child.animate, child.init.style, 'transformOrigin');
    insertKf(offsetList, offsetHash, child.animate, child.init.style, 'translateX');
    insertKf(offsetList, offsetHash, child.animate, child.init.style, 'translateY');
    insertKf(offsetList, offsetHash, child.animate, child.init.style, 'translateZ');
    insertKf(offsetList, offsetHash, child.animate, child.init.style, 'rotateX');
    insertKf(offsetList, offsetHash, child.animate, child.init.style, 'rotateY');
    insertKf(offsetList, offsetHash, child.animate, child.init.style, 'rotateZ');
  }
  $.ae2karas.log(data.animate);
  for(let i = 0, len = offsetList.length; i < len; i++) {
    // let item = i ===
  }
};
