function toPoints(data) {
  let { starType, points, rotation, innerRadius, innerRoundness, outerRadius, outerRoundness } = data;
  // 星形
  if(starType === 1) {}
  // 多边形仅外接圆有效
  else if(starType === 2) {}
}

export default {
  toPoints,
};
