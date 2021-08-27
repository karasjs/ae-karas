function group(prop) {
  // 这里是矩形1层，只需关注Group即可，还有个blendMode无视
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      $.ae2karas.log('vector2: ' + matchName);
      switch(matchName) {
        case 'ADBE Vectors Group':
          return content(item);
      }
    }
  }
}

function content(prop) {
  // 矩形1下面会多出一层内容层看不见，就是本层，其下面则是可视的子属性层
  let res = {};
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Shape - Rect':
          res.content = rect(item);
          break;
        case 'ADBE Vector Graphic - Stroke':
          res.stroke = stroke(item);
          break;
        case 'ADBE Vector Graphic - Fill':
          res.fill = fill(item);
          break;
      }
    }
  }
  return res;
}

function rect(prop) {
  // 矩形路径层
  let res = {
    type: 'rect',
  };
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Shape Direction':
          res.direction = item.value;
          break;
        case 'ADBE Vector Rect Size':
          res.size = item.value;
          break;
        case 'ADBE Vector Rect Position':
          res.position = item.value;
          break;
        case 'ADBE Vector Rect Roundness':
          res.roundness = item.value;
          break;
      }
    }
  }
  return res;
}

function stroke(prop) {
  let res = {};
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Stroke Color':
          res.color = item.value;
          break;
        case 'ADBE Vector Stroke Opacity':
          res.opacity = item.value;
          break;
        case 'ADBE Vector Stroke Width':
          res.width = item.value;
          break;
        case 'ADBE Vector Line Cap':
          res.lineCap = item.value;
          break;
        case 'ADBE Vector Stroke Line Join':
          res.lineJoin = item.value;
          break;
        case 'ADBE Vector Stroke Miter Limit':
          res.miterLimit = item.value;
          break;
        case 'ADBE Vector Stroke Dashes':
          res.dashes = dash(item);
          break;
      }
    }
  }
  return res;
}

function fill(prop) {
  let res = {};
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Fill Rule':
          res.rule = item.value;
          break;
        case 'ADBE Vector Fill Color':
          res.color = item.value;
          break;
        case 'ADBE Vector Fill Opacity':
          res.opacity = item.value;
          break;
      }
    }
  }
  return res;
}

function dash(prop) {
  let res = {};
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Stroke Dash 1':
          res.dash1 = item.value;
          break;
        case 'ADBE Vector Stroke Dash 2':
          res.dash2 = item.value;
          break;
        case 'ADBE Vector Stroke Dash 3':
          res.dash3 = item.value;
          break;
        case 'ADBE Vector Stroke Gap 1':
          res.gap1 = item.value;
          break;
        case 'ADBE Vector Stroke Gap 2':
          res.gap2 = item.value;
          break;
        case 'ADBE Vector Stroke Gap 3':
          res.gap3 = item.value;
          break;
        case 'ADBE Vector Stroke Offset':
          res.offset = item.value;
          break;
      }
    }
  }
  return res;
}

export default function(prop, library) {
  // 这里是内容层，一般只有1个属性，如矩形1
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Group':
          return group(item, library);
        // case 'ADBE Vector Shape - Rect':
        //   break;
        // case 'ADBE Vector Shape - Ellipse':
        //   break;
        // case 'ADBE Vector Shape - Star':
        //   break;
        // case 'ADBE Vector Shape - Group':
        //   break;
        // case 'ADBE Vector Shape - Gro':
        //   break;
        // case 'ADBE Vector Graphic - Fill':
        //   break;
        // case 'ADBE Vector Graphic - G-Fill':
        //   break;
        // case 'ADBE Vector Filter - Trim':
        //   break;
        // case 'ADBE Vector Graphic - Stroke':
        //   break;
        // case 'ADBE Vector Graphic - G-Stroke':
        //   break;
      }
    }
  }
};
