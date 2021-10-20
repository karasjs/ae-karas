import { transformVector, transformGeom } from './transform';

function group(prop, navigationShapeTree) {
  let res = {};
  // 这里是矩形1层，主要关注Groups属性即可，blendMode暂时无视，transform被上钻2层提前
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      navigationShapeTree.push(item.name);
      switch(matchName) {
        case 'ADBE Vectors Group':
          res.content = content(item, navigationShapeTree);
          break;
        case 'ADBE Vector Transform Group':
          // 奇怪的地方，显示应该下钻2层到如rect同级，可实际提前了
          res.transform = transformVector(item);
          break;
      }
      navigationShapeTree.pop();
    }
  }
  res.content.transform = res.transform;
  return res.content;
}

function content(prop, navigationShapeTree) {
  // 矩形1下面会多出一层内容层看不见，就是本层，其下面则是可视的子属性层
  let res = {
    name: prop.name,
    content: [],
  };
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      navigationShapeTree.push(item.name);
      switch(matchName) {
        case 'ADBE Vector Shape - Rect':
          res.content.push(rect(item));
          break;
        case 'ADBE Vector Shape - Ellipse':
          res.content.push(ellipse(item));
          break;
        case 'ADBE Vector Shape - Star':
          res.content.push(star(item));
          break;
        case 'ADBE Vector Shape - Group':
          res.content.push(path(item));
          break;
        case 'ADBE Vector Graphic - Stroke':
          res.stroke = stroke(item);
          break;
        case 'ADBE Vector Graphic - Fill':
          res.fill = fill(item);
          break;
        case 'ADBE Vector Graphic - G-Fill':
          res.gFill = gFill(item, navigationShapeTree);
          break;
      }
      navigationShapeTree.pop();
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
          res.size = transformGeom(item);
          break;
        case 'ADBE Vector Rect Position':
          res.position = transformGeom(item);
          break;
        case 'ADBE Vector Rect Roundness':
          res.roundness = transformGeom(item);
          break;
      }
    }
  }
  return res;
}

function ellipse(prop) {
  let res = {
    type: 'ellipse',
  };
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Shape Direction':
          res.direction = item.value;
          break;
        case 'ADBE Vector Ellipse Size':
          res.size = transformGeom(item);
          break;
        case 'ADBE Vector Ellipse Position':
          res.position = transformGeom(item);
          break;
      }
    }
  }
  return res;
}

function star(prop) {
  let res = {
    type: 'star',
  };
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Shape Direction':
          res.direction = item.value;
          break;
        case 'ADBE Vector Star Type':
          res.starType = item.value;
          break;
        case 'ADBE Vector Star Points':
          res.points = item.value;
          break;
        case 'ADBE Vector Star Position':
          res.position = item.value;
          break;
        case 'ADBE Vector Star Inner Radius':
          res.innerRadius = item.value;
          break;
        case 'ADBE Vector Star Outer Radius':
          res.outerRadius = item.value;
          break;
        case 'ADBE Vector Star Inner Roundess':
          res.innerRoundness = item.value;
          break;
        case 'ADBE Vector Star Outer Roundess':
          res.outerRoundness = item.value;
          break;
        case 'ADBE Vector Star Rotation':
          res.rotation = item.value;
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
          res.color = transformGeom(item);
          break;
        case 'ADBE Vector Stroke Opacity':
          res.opacity = transformGeom(item);
          break;
        case 'ADBE Vector Stroke Width':
          res.width = transformGeom(item);
          break;
        case 'ADBE Vector Line Cap':
          res.lineCap = transformGeom(item);
          break;
        case 'ADBE Vector Stroke Line Join':
          res.lineJoin = transformGeom(item);
          break;
        case 'ADBE Vector Stroke Miter Limit':
          res.miterLimit = transformGeom(item);
          break;
        // case 'ADBE Vector Stroke Dashes':
        //   res.dashes = dash(item);
        //   break;
      }
    }
  }
  // 特殊的获取虚线样式
  let dashes = prop.property('Dashes');
  if(dashes) {
    let d = [];
    let g = [];
    for(let i = 1; i <= dashes.numProperties; i++) {
      let item = dashes.property(i);
      if(item && item.enabled) {
        let matchName = item.matchName;
        if(item.canSetExpression) {
          if(matchName.indexOf('ADBE Vector Stroke Dash') > -1) {
            let j = /\d+/.exec(matchName);
            d[j[0] - 1] = item.value;
          }
          else if(matchName.indexOf('ADBE Vector Stroke Gap') > -1) {
            let j = /\d+/.exec(matchName);
            g[j[0] - 1] = item.value;
          }
        }
      }
    }
    if(d.length) {
      let v = [];
      for(let i = 0, len = d.length; i < len; i++) {
        v.push(d[i]);
        if(g[i] === undefined) {
          v.push(d[i]);
        }
        else {
          v.push(g[i]);
        }
      }
      res.dashes = v;
    }
  }
  return res;
}

function path(prop) {
  let res = {
    type: 'path',
  };
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      switch(matchName) {
        case 'ADBE Vector Shape Direction':
          res.direction = item.value;
          break;
        case 'ADBE Vector Shape':
          res.points = transformGeom(item);
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
          res.color = transformGeom(item);
          break;
        case 'ADBE Vector Fill Opacity':
          res.opacity = transformGeom(item);
          break;
      }
    }
  }
  return res;
}

function gFill(prop, navigationShapeTree) {
  let res = {};
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      navigationShapeTree.push(item.name);
      switch(matchName) {
        case 'ADBE Vector Composite Order':
          break;
        case 'ADBE Vector Fill Rule':
          res.rule = item.value;
          break;
        case 'ADBE Vector Grad Type':
          res.type = item.value;
          break;
        case 'ADBE Vector Grad Start Pt':
          res.start = item.value;
          break;
        case 'ADBE Vector Grad End Pt':
          res.end = item.value;
          break;
        case 'ADBE Vector Grad Colors':
          res.colors = gradient(item, navigationShapeTree);
          break;
        case 'ADBE Vector Fill Opacity':
          res.opacity = item.value;
          break;
      }
      navigationShapeTree.pop();
    }
  }
  return res;
}

function gradient(prop, navigationShapeTree) {
  let numKeys = prop.numKeys || 1;
  let ff = app.project.file;
  if(ff) {
    let demoFile = new File(ff.absoluteURI);
    demoFile.open('r', 'TEXT', '????');
    let fileString = demoFile.read(demoFile.length);
    fileString = fileString
      .replace('渐变填充', 'Gradient Fill')
      .replace('渐变描边', 'Gradient Stroke');
    let hasNoGradColorData = false;
    if(fileString.indexOf('ADBE Vector Grad Colors') === -1) {
      hasNoGradColorData = true;
    }

    let gradientIndex = 0, navigationIndex = 0;
    let i = 0, len = navigationShapeTree.length;
    while(i < len) {
      let encoded = unescape(encodeURIComponent(navigationShapeTree[i] + 'LIST'));
      let stringIndex = fileString.indexOf(encoded, navigationIndex + 1);
      if(stringIndex === -1) {
        encoded = unescape(encodeURIComponent(navigationShapeTree[i] + ' LIST'));
        stringIndex = fileString.indexOf(encoded, navigationIndex + 1);
      }
      if(stringIndex === -1) {
        encoded = unescape(encodeURIComponent(navigationShapeTree[i]));
        stringIndex = fileString.indexOf(encoded, navigationIndex + 1);
      }
      navigationIndex = stringIndex;
      i += 1;
    }
    gradientIndex = fileString.indexOf('ADBE Vector Grad Colors', navigationIndex);
    let gradFillIndex = fileString.indexOf('ADBE Vector Graphic - G-Fill', navigationIndex);
    let gradStrokeIndex = fileString.indexOf('ADBE Vector Graphic - G-Stroke', navigationIndex);
    let limitIndex;
    if(gradStrokeIndex !== -1 && gradFillIndex !== -1) {
      limitIndex = Math.min(gradFillIndex, gradStrokeIndex);
    }
    else {
      limitIndex = Math.max(gradFillIndex, gradStrokeIndex);
    }
    if(limitIndex === -1) {
      limitIndex = Number.MAX_VALUE;
    }
    let lastIndex;
    let currentKey = 0, keyframes = [], hasOpacity = false, maxOpacities = 0, maxColors = 0;
    while(currentKey < numKeys) {
      let gradientData = {};
      gradientIndex = fileString.indexOf('<prop.map', gradientIndex);
      if(hasNoGradColorData || gradientIndex > limitIndex || (gradientIndex === -1 && limitIndex === Number.MAX_VALUE)) {
        gradientData.c = [[0, 1, 1, 1], [1, 0, 0, 0]];
        maxColors = Math.max(maxColors, 2);
      }
      else {
        let endMatch = '</prop.map>';
        lastIndex = fileString.indexOf(endMatch, gradientIndex);
        let xmlString = fileString.substr(gradientIndex, lastIndex + endMatch.length - gradientIndex);
        xmlString = xmlString.replace(/\n/g, '');
        let XML_Ob = new XML(xmlString);
        let stops = XML_Ob['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'];
        let colors = XML_Ob['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'][1]['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'];
        i = 0;
        len = stops.length();
        let opacitiesArr = [], op, floats, nextFloats, midPoint, midPosition;
        while(i < len) {
          floats = stops[i]['prop.list'][0]['prop.pair'][0]['array'][0].float;
          op = [];
          op.push(roundNumber(Number(floats[0].toString()), 3));
          op.push(roundNumber(Number(floats[2].toString()), 3));
          if(op[1] !== 1) {
            hasOpacity = true;
          }
          opacitiesArr.push(op);
          midPosition = roundNumber(Number(floats[1].toString()), 3);
          if(i < len - 1 /*&& midPosition !== 0.5*/) {
            op = [];
            nextFloats = stops[i + 1]['prop.list'][0]['prop.pair'][0]['array'][0].float;
            midPoint = Number(floats[0].toString()) + (Number(nextFloats[0].toString()) - Number(floats[0].toString())) * midPosition;
            let midPointValue = Number(floats[2].toString()) + (Number(nextFloats[2].toString()) - Number(floats[2].toString())) * 0.5;
            op.push(roundNumber(midPoint, 3));
            op.push(roundNumber(midPointValue, 3));
            opacitiesArr.push(op);
          }
          i += 1;
        }
        i = 0;
        len = colors.length();
        let colorsArr = [];
        let sortedColors = [];
        while(i < len) {
          sortedColors.push(colors[i]['prop.list'][0]['prop.pair'][0]['array'][0].float);
          i += 1;
        }

        sortedColors.sort(sortFunction);

        i = 0;

        while(i < len) {
          floats = sortedColors[i];
          op = [];
          op.push(roundNumber(Number(floats[0].toString()), 3));
          op.push(roundNumber(Number(floats[2].toString()), 3));
          op.push(roundNumber(Number(floats[3].toString()), 3));
          op.push(roundNumber(Number(floats[4].toString()), 3));
          colorsArr.push(op);
          midPosition = roundNumber(Number(floats[1].toString()), 3);
          if(i < len - 1 /*&& midPosition !== 0.5*/) {
            op = [];
            nextFloats = sortedColors[i + 1];
            midPoint = Number(floats[0].toString()) + (Number(nextFloats[0].toString()) - Number(floats[0].toString())) * midPosition;
            let midPointValueR = Number(floats[2].toString()) + (Number(nextFloats[2].toString()) - Number(floats[2].toString())) * 0.5;
            let midPointValueG = Number(floats[3].toString()) + (Number(nextFloats[3].toString()) - Number(floats[3].toString())) * 0.5;
            let midPointValueB = Number(floats[4].toString()) + (Number(nextFloats[4].toString()) - Number(floats[4].toString())) * 0.5;
            op.push(roundNumber(midPoint, 3));
            op.push(roundNumber(midPointValueR, 3));
            op.push(roundNumber(midPointValueG, 3));
            op.push(roundNumber(midPointValueB, 3));
            colorsArr.push(op);
          }
          i += 1;
        }
        gradientData.c = colorsArr;
        gradientData.o = opacitiesArr;
        maxOpacities = Math.max(maxOpacities, opacitiesArr.length);
        maxColors = Math.max(maxColors, colorsArr.length);
      }

      gradientIndex = lastIndex;

      keyframes.push(gradientData);
      currentKey += 1;
    }
    i = 0;
    let arr, arrayLength, count, lastValue, offsetValue, mergedKeys = [], mergedArr, j;
    while(i < numKeys) {
      mergedArr = [];
      if(keyframes[i].c.length < maxColors) {
        arr = keyframes[i].c;
        arrayLength = arr.length;
        lastValue = arr[arrayLength - 1];
        offsetValue = lastValue[0];
        count = 0;
        while(arrayLength + count < maxColors) {
          offsetValue -= 0.001;
          arr.splice(arrayLength - 1, 0, [offsetValue, lastValue[1], lastValue[2], lastValue[3]]);
          count += 1;
        }
      }
      for(j = 0; j < maxColors; j += 1) {
        for(let k = 0; k < 4; k += 1) {
          mergedArr.push(keyframes[i].c[j][k]);
        }
      }
      if(!hasOpacity) {
        delete keyframes[i].o;
      }
      else {
        if(keyframes[i].o.length < maxOpacities) {
          arr = keyframes[i].o;
          arrayLength = arr.length;
          lastValue = arr[arrayLength - 1];
          offsetValue = lastValue[0];
          count = 0;
          while(arrayLength + count < maxOpacities) {
            offsetValue -= 0.001;
            arr.splice(arrayLength - 1, 0, [offsetValue, lastValue[1], lastValue[2], lastValue[3]]);
            count += 1;
          }
        }
        for(j = 0; j < maxOpacities; j += 1) {
          for(let l = 0; l < 2; l += 1) {
            mergedArr.push(keyframes[i].o[j][l]);
          }
        }
      }
      if(numKeys <= 1) {
        mergedKeys = mergedArr;
      }
      else {
        mergedKeys.push(mergedArr);
      }
      i += 1;
    }
    return {
      m: mergedKeys,
      p: maxColors
    };
  }
}

function roundNumber(num, decimals) {
  num = num || 0;
  if(typeof num === 'number') {
    return parseFloat(num.toFixed(decimals));
  }
  else {
    return roundArray(num, decimals);
  }
}

function roundArray(arr, decimals) {
  var i, len = arr.length;
  var retArray = [];
  for(i = 0; i < len; i += 1) {
    if(typeof arr[i] === 'number') {
      retArray.push(roundNumber(arr[i], decimals));
    }
    else {
      retArray.push(roundArray(arr[i], decimals));
    }
  }
  return retArray;
}

function sortFunction(a, b) {
  var a_0 = Number(a[0].toString())
  var b_0 = Number(b[0].toString())
  if(a_0 === b_0) {
    return 0;
  }
  else {
    return (a_0 < b_0) ? -1 : 1;
  }
}

export default function(prop, navigationShapeTree) {
  let res = {};
  // 这里是内容层，一般只有1个属性，如矩形1
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      navigationShapeTree.push(item.name);
      switch(matchName) {
        case 'ADBE Vector Group':
          res.shape = group(item, navigationShapeTree);
          break;
        case 'ADBE Vector Filter - Trim':
          res.trim = transformVector(item);
          break;
      }
      navigationShapeTree.pop();
    }
  }
  return res;
};
