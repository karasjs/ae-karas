export function r2d(n) {
  return n * 180 / Math.PI;
}

/**
 * 百分比截取贝塞尔中的一段，t为[0, 1]
 * @param points
 * @param t
 */
export function sliceBezier(points, t) {
  let p1, p2, p3, p4;
  if(points.length === 8) {
    p1 = points.slice(0, 2);
    p2 = points.slice(2, 4);
    p3 = points.slice(4, 8);
    p4 = points.slice(6, 8);
  }
  else {
    p1 = points[0];
    p2 = points[1];
    p3 = points[2];
    p4 = points[3];
  }
  let x1 = p1[0], y1 = p1[1];
  let x2 = p2[0], y2 = p2[1];
  let x3 = p3[0], y3 = p3[1];
  let x12 = (x2 - x1) * t + x1;
  let y12 = (y2 - y1) * t + y1;
  let x23 = (x3 - x2) * t + x2;
  let y23 = (y3 - y2) * t + y2;
  let x123 = (x23 - x12) * t + x12;
  let y123 = (y23 - y12) * t + y12;
  if(points.length === 4 || points.length === 8) {
    let x4 = p4[0], y4 = p4[1];
    let x34 = (x4 - x3) * t + x3;
    let y34 = (y4 - y3) * t + y3;
    let x234 = (x34 - x23) * t + x23;
    let y234 = (y34 - y23) * t + y23;
    let x1234 = (x234 - x123) * t + x123;
    let y1234 = (y234 - y123) * t + y123;
    if(points.length === 8) {
      return [x1, y1, x12, y12, x123, y123, x1234, y1234];
    }
    return [[x1, y1], [x12, y12], [x123, y123], [x1234, y1234]];
  }
  else if(points.length === 3) {
    return [[x1, y1], [x12, y12], [x123, y123]];
  }
}

export function sliceBezier2Both(points, start = 0, end = 1) {
  start = Math.max(start, 0);
  end = Math.min(end, 1);
  if(start === 0 && end === 1) {
    return points;
  }
  if(end < 1) {
    points = sliceBezier(points, end);
  }
  if(start > 0) {
    if(end < 1) {
      start = start / end;
    }
    points = sliceBezier(points.reverse(), (1 - start)).reverse();
  }
  return points;
}
