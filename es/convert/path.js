export default {
  parse(vertices, inTangents, outTangents, closed) {
    let x1 = vertices[0][0], y1 = vertices[0][1];
    let x2 = x1, y2 = y1;
    // 控制点是相对于顶点的坐标
    let it = inTangents[0], ot = outTangents[0];
    if(it[0]) {
      x1 = Math.max(x1, x1 + it[0]);
      x2 = Math.min(x2, x1 + it[0]);
    }
    if(it[1]) {
      y1 = Math.max(y1, y1 + it[1]);
      y2 = Math.min(y2, y1 + it[1]);
    }
    if(ot[0]) {
      x1 = Math.max(x1, x1 + ot[0]);
      x2 = Math.min(x2, x1 + ot[0]);
    }
    if(ot[1]) {
      y1 = Math.max(y1, y1 + ot[1]);
      y2 = Math.min(y2, y1 + ot[1]);
    }
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
    let w = x1 - x2, h = y1 - y2;
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
    return {
      x1,
      y1,
      x2,
      y2,
      width: w,
      height: h,
      points: pts,
      controls: cts,
    };
  },
  rect2polyline(width, height, roundness) {
    roundness = roundness || 0;
    let r = Math.min(width, height) * 0.5;
    roundness = Math.min(roundness, r);
    let pts = [], cts = [];
    if(roundness && roundness > 0) {
      let h = roundness * 0.5522847498307936;
      pts.push([(width - roundness) / width, 0]);
      cts.push([(width - roundness + h) / width, 0, 1, (roundness - h) / height]);
      pts.push([1, roundness / height]);
      cts.push([]);
      pts.push([1, (height - roundness) / height]);
      cts.push([1, (height - roundness + h) / height, (width - roundness + h) / width, 1]);
      pts.push([(width - roundness) / width, 1]);
      cts.push([]);
      pts.push([roundness / width, 1]);
      cts.push([(roundness - h) / width, 1, 0, (height - roundness + h) / height]);
      pts.push([0, (height - roundness) / height]);
      cts.push([]);
      pts.push([0, roundness / height]);
      cts.push([0, (roundness - h) / height, (roundness - h) / width, 0]);
      pts.push([roundness / width, 0]);
      cts.push([]);
      pts.push([(width - roundness) / width, 0]);
    }
    else {
      pts.push([1, 0]);
      pts.push([1, 1]);
      pts.push([0, 1]);
      pts.push([0, 0]);
      pts.push([1, 0]);
    }
    return {
      points: pts,
      controls: cts,
    }
  },
  ellipse2polyline() {
    let pts = [], cts = [];
    let rx =  0.5 * 0.5522847498307936, ry = 0.5 * 0.5522847498307936;
    pts.push([0.5, 0]);
    cts.push([0.5 + rx, 0, 1, 0.5 - ry]);
    pts.push([1, 0.5]);
    cts.push([1, 0.5 + ry, 0.5 + rx, 1]);
    pts.push([0.5, 1]);
    cts.push([0.5 - rx, 1, 0, 0.5 + ry]);
    pts.push([0, 0.5]);
    cts.push([0, 0.5 - ry, rx, 0]);
    pts.push([0.5, 0]);
    return {
      points: pts,
      controls: cts,
    }
  },
};
