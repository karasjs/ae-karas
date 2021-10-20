'use strict';

var enums = {
  ES_TYPE: {
    FOLDER_ITEM: 'FolderItem',
    FOOTAGE_ITEM: 'FootageItem',
    COMP_ITEM: 'CompItem',
    UNKNOWN: 'unknown'
  },
  EVENT: {
    INIT: 'ae2karas:init',
    LOG: 'ae2karas:log',
    WARN: 'ae2karas:warn',
    ERROR: 'ae2karas:error',
    FINISH: 'ae2karas:finish',
    CANCEL: 'ae2karas:cancel',
    ADD_TEMP: 'ae2karas:addTemp',
    DEL_TEMP: 'ae2karas:delTemp'
  }
};

var LAYER_TRANSFORM = {
  'ADBE Anchor Point': 'anchorPoint',
  'ADBE Position': 'position',
  'ADBE Position_0': 'position_0',
  'ADBE Position_1': 'position_1',
  'ADBE Position_2': 'position_2',
  'ADBE Scale': 'scale',
  'ADBE Orientation': 'orientation',
  'ADBE Rotate X': 'rotateX',
  'ADBE Rotate Y': 'rotateY',
  'ADBE Rotate Z': 'rotateZ',
  'ADBE Opacity': 'opacity'
};
var VECTOR_TRANSFORM = {
  'ADBE Vector Anchor': 'anchorPoint',
  'ADBE Vector Position': 'position',
  'ADBE Vector Scale': 'scale',
  'ADBE Vector Skew': 'skew',
  'ADBE Vector Skew Axis': 'skewAxis',
  'ADBE Vector Rotation': 'rotateZ',
  'ADBE Vector Group Opacity': 'opacity',
  'ADBE Vector Trim Start': 'start',
  'ADBE Vector Trim End': 'end'
};
var MASK_TRANSFORM = {
  'ADBE Mask Shape': 'points',
  'ADBE Mask Opacity': 'opacity'
};

function getPropertyValues(prop, matchName, noEasing) {
  var numKeys = prop.numKeys; // 根据关键帧数量，2+帧是普通变化，1帧等同于0帧value

  if (numKeys && numKeys > 1) {
    var arr = [];

    for (var i = 1; i <= numKeys; i++) {
      // 特殊的曲线位移动画用translatePath表示
      if (i !== numKeys && (matchName === 'ADBE Position' || matchName === 'ADBE Vector Position')) {
        var v1 = prop.keyValue(i),
            v2 = prop.keyValue(i + 1);
        var c1 = prop.keyOutSpatialTangent(i),
            c2 = prop.keyInSpatialTangent(i + 1); // y = kx + b，看是否有曲线，没有忽略

        var x1 = v1[0],
            y1 = v1[1],
            x2 = v2[0],
            y2 = v2[1];

        if ((x1 !== x2 || y1 !== y2) && (c1[0] !== 0 || c1[1] !== 0 || c2[0] !== 0 || c2[1] !== 0)) {
          var p1 = [v1[0] + c1[0], v1[1] + c1[1]],
              p2 = [v2[0] + c2[0], v2[1] + c2[1]]; // 垂直特殊情况

          if (x1 === 0 && x2 === 0) {
            if (Math.abs(c1[0]) >= 1 || Math.abs(c2[0]) >= 1) {
              var _o = {
                time: prop.keyTime(i) * 1000,
                value: [x1, y1, p1[0], p1[1], p2[0], p2[1], x2, y2]
              };

              if (i !== numKeys && !noEasing) {
                _o.easing = getEasing(prop, i, i + 1);
              }

              arr.push(_o);
              continue;
            }
          } // 二元一次方程
          else {
            var k = void 0,
                b = void 0;

            if (x1 === 0) {
              b = y1;
              k = (y2 - b) / x2;
            } else if (x2 === 0) {
              b = y2;
              k = (y1 - b) / x1;
            } else {
              var r = x1 / x2;
              b = (y1 - y2 * r) / (1 - r);
              k = (y1 - b) / x1;
            } // 精度小于一定认为无效


            var is1 = Math.abs(k * p1[0] + b - p1[1]) >= 1;
            var is2 = Math.abs(k * p2[0] + b - p2[1]) >= 1;

            if (is1 || is2) {
              var _o2 = {
                time: prop.keyTime(i) * 1000,
                value: [x1, y1, p1[0], p1[1], p2[0], p2[1], x2, y2]
              };

              if (i !== numKeys && !noEasing) {
                _o2.easing = getEasing(prop, i, i + 1);
              }

              arr.push(_o2);
              continue;
            }
          }
        }
      }

      var o = {
        time: prop.keyTime(i) * 1000,
        value: prop.keyValue(i)
      };

      if (i !== numKeys && !noEasing) {
        o.easing = getEasing(prop, i, i + 1);
      }

      arr.push(o);
    }

    return arr;
  } else if (numKeys && numKeys > 0) {
    return [prop.keyValue(1)];
  } else {
    return [prop.value];
  }
}
/**
 * https://www.zhihu.com/question/24404065
 * 柄点1的X值 = 关键帧1的影响值/100
 * 柄点1的Y值 = 关键帧1的输出速度/两关键帧平均速度*柄点1的X值
 * 柄点2的X值 = 1 - 关键帧2的影响值/100
 * 柄点2的Y值 = 1 - 关键帧2的输入速度/两关键帧平均速度*柄点2的X值
 * @param prop
 * @param start
 * @param end
 */


function getEasing(prop, start, end) {
  var t1 = prop.keyTime(start),
      t2 = prop.keyTime(end);
  var v1 = prop.keyValue(start),
      v2 = prop.keyValue(end);
  var e1 = prop.keyOutTemporalEase(start)[0],
      e2 = prop.keyInTemporalEase(end)[0]; // let c1 = prop.keyOutSpatialTangent(start), c2 = prop.keyInSpatialTangent(end);
  // $.ae2karas.log(c1);
  // $.ae2karas.log(c2);

  var x1 = e1.influence * 0.01,
      x2 = 1 - e2.influence * 0.01;
  var y1, y2;
  var matchName = prop.matchName;

  if (['ADBE Anchor Point', 'ADBE Position', 'ADBE Vector Anchor', 'ADBE Vector Position', 'ADBE Scale', 'ADBE Vector Scale', 'ADBE Vector Skew'].indexOf(matchName) > -1) {
    var avSpeedX = Math.abs(v2[0] - v1[0]) / (t2 - t1);
    var avSpeedY = Math.abs(v2[1] - v1[1]) / (t2 - t1);
    var avSpeed = Math.sqrt(avSpeedX * avSpeedX + avSpeedY * avSpeedY);

    if (avSpeed !== 0) {
      y1 = x1 * e1.speed / avSpeed;
      y2 = 1 - (1 - x2) * e2.speed / avSpeed;
    }
  } else if (v2 !== v1) {
    var _avSpeed = Math.abs(v2 - v1) / (t2 - t1);

    y1 = x1 * e1.speed / _avSpeed;
    y2 = 1 - (1 - x2) * e2.speed / _avSpeed;
  }

  if (x1 === y1 && x2 === y2 || y1 === undefined || y2 === undefined) {
    return;
  }

  return [x1, y1, x2, y2];
}

function transformLayer(prop) {
  var res = {};

  for (var i = 1; prop && i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      if (LAYER_TRANSFORM.hasOwnProperty(matchName)) {
        res[LAYER_TRANSFORM[matchName]] = getPropertyValues(item, matchName, false);
      }
    }
  }

  return res;
}
function transformVector(prop) {
  var res = {};

  for (var i = 1; prop && i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      if (VECTOR_TRANSFORM.hasOwnProperty(matchName)) {
        res[VECTOR_TRANSFORM[matchName]] = getPropertyValues(item, matchName, false);
      }
    }
  }

  return res;
}
function transformMask(prop) {
  var res = {};

  for (var i = 1; prop && i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      if (MASK_TRANSFORM.hasOwnProperty(matchName)) {
        res[MASK_TRANSFORM[matchName]] = getPropertyValues(item, matchName, true);
      }
    }
  }

  return res;
}
function transformGeom(prop) {
  return getPropertyValues(prop, '', true);
}

function group(prop, navigationShapeTree) {
  var res = {}; // 这里是矩形1层，主要关注Groups属性即可，blendMode暂时无视，transform被上钻2层提前

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;
      navigationShapeTree.push(item.name);

      switch (matchName) {
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
  var res = {
    name: prop.name,
    content: []
  };

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;
      navigationShapeTree.push(item.name);

      switch (matchName) {
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
          res.content.push(path$1(item));
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
  var res = {
    type: 'rect'
  };

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
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
  var res = {
    type: 'ellipse'
  };

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
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
  var res = {
    type: 'star'
  };

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
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
  var res = {};

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
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
  } // 特殊的获取虚线样式


  var dashes = prop.property('Dashes');

  if (dashes) {
    var d = [];
    var g = [];

    for (var _i = 1; _i <= dashes.numProperties; _i++) {
      var _item = dashes.property(_i);

      if (_item && _item.enabled) {
        var _matchName = _item.matchName;

        if (_item.canSetExpression) {
          if (_matchName.indexOf('ADBE Vector Stroke Dash') > -1) {
            var j = /\d+/.exec(_matchName);
            d[j[0] - 1] = _item.value;
          } else if (_matchName.indexOf('ADBE Vector Stroke Gap') > -1) {
            var _j = /\d+/.exec(_matchName);

            g[_j[0] - 1] = _item.value;
          }
        }
      }
    }

    if (d.length) {
      var v = [];

      for (var _i2 = 0, len = d.length; _i2 < len; _i2++) {
        v.push(d[_i2]);

        if (g[_i2] === undefined) {
          v.push(d[_i2]);
        } else {
          v.push(g[_i2]);
        }
      }

      res.dashes = v;
    }
  }

  return res;
}

function path$1(prop) {
  var res = {
    type: 'path'
  };

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
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
  var res = {};

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
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
  var res = {};

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;
      navigationShapeTree.push(item.name);

      switch (matchName) {
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
  var numKeys = prop.numKeys || 1;
  var ff = app.project.file;

  if (ff) {
    var demoFile = new File(ff.absoluteURI);
    demoFile.open('r', 'TEXT', '????');
    var fileString = demoFile.read(demoFile.length);
    fileString = fileString.replace('渐变填充', 'Gradient Fill').replace('渐变描边', 'Gradient Stroke');
    var hasNoGradColorData = false;

    if (fileString.indexOf('ADBE Vector Grad Colors') === -1) {
      hasNoGradColorData = true;
    }

    var gradientIndex = 0,
        navigationIndex = 0;
    var i = 0,
        len = navigationShapeTree.length;

    while (i < len) {
      var encoded = unescape(encodeURIComponent(navigationShapeTree[i] + 'LIST'));
      var stringIndex = fileString.indexOf(encoded, navigationIndex + 1);

      if (stringIndex === -1) {
        encoded = unescape(encodeURIComponent(navigationShapeTree[i] + ' LIST'));
        stringIndex = fileString.indexOf(encoded, navigationIndex + 1);
      }

      if (stringIndex === -1) {
        encoded = unescape(encodeURIComponent(navigationShapeTree[i]));
        stringIndex = fileString.indexOf(encoded, navigationIndex + 1);
      }

      navigationIndex = stringIndex;
      i += 1;
    }

    gradientIndex = fileString.indexOf('ADBE Vector Grad Colors', navigationIndex);
    var gradFillIndex = fileString.indexOf('ADBE Vector Graphic - G-Fill', navigationIndex);
    var gradStrokeIndex = fileString.indexOf('ADBE Vector Graphic - G-Stroke', navigationIndex);
    var limitIndex;

    if (gradStrokeIndex !== -1 && gradFillIndex !== -1) {
      limitIndex = Math.min(gradFillIndex, gradStrokeIndex);
    } else {
      limitIndex = Math.max(gradFillIndex, gradStrokeIndex);
    }

    if (limitIndex === -1) {
      limitIndex = Number.MAX_VALUE;
    }

    var lastIndex;
    var currentKey = 0,
        keyframes = [],
        hasOpacity = false,
        maxOpacities = 0,
        maxColors = 0;

    while (currentKey < numKeys) {
      var gradientData = {};
      gradientIndex = fileString.indexOf('<prop.map', gradientIndex);

      if (hasNoGradColorData || gradientIndex > limitIndex || gradientIndex === -1 && limitIndex === Number.MAX_VALUE) {
        gradientData.c = [[0, 1, 1, 1], [1, 0, 0, 0]];
        maxColors = Math.max(maxColors, 2);
      } else {
        var endMatch = '</prop.map>';
        lastIndex = fileString.indexOf(endMatch, gradientIndex);
        var xmlString = fileString.substr(gradientIndex, lastIndex + endMatch.length - gradientIndex);
        xmlString = xmlString.replace(/\n/g, '');
        var XML_Ob = new XML(xmlString);
        var stops = XML_Ob['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'];
        var colors = XML_Ob['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'][1]['prop.list'][0]['prop.pair'][0]['prop.list'][0]['prop.pair'];
        i = 0;
        len = stops.length();
        var opacitiesArr = [],
            op = void 0,
            floats = void 0,
            nextFloats = void 0,
            midPoint = void 0,
            midPosition = void 0;

        while (i < len) {
          floats = stops[i]['prop.list'][0]['prop.pair'][0]['array'][0]["float"];
          op = [];
          op.push(roundNumber(Number(floats[0].toString()), 3));
          op.push(roundNumber(Number(floats[2].toString()), 3));

          if (op[1] !== 1) {
            hasOpacity = true;
          }

          opacitiesArr.push(op);
          midPosition = roundNumber(Number(floats[1].toString()), 3);

          if (i < len - 1
          /*&& midPosition !== 0.5*/
          ) {
            op = [];
            nextFloats = stops[i + 1]['prop.list'][0]['prop.pair'][0]['array'][0]["float"];
            midPoint = Number(floats[0].toString()) + (Number(nextFloats[0].toString()) - Number(floats[0].toString())) * midPosition;
            var midPointValue = Number(floats[2].toString()) + (Number(nextFloats[2].toString()) - Number(floats[2].toString())) * 0.5;
            op.push(roundNumber(midPoint, 3));
            op.push(roundNumber(midPointValue, 3));
            opacitiesArr.push(op);
          }

          i += 1;
        }

        i = 0;
        len = colors.length();
        var colorsArr = [];
        var sortedColors = [];

        while (i < len) {
          sortedColors.push(colors[i]['prop.list'][0]['prop.pair'][0]['array'][0]["float"]);
          i += 1;
        }

        sortedColors.sort(sortFunction);
        i = 0;

        while (i < len) {
          floats = sortedColors[i];
          op = [];
          op.push(roundNumber(Number(floats[0].toString()), 3));
          op.push(roundNumber(Number(floats[2].toString()), 3));
          op.push(roundNumber(Number(floats[3].toString()), 3));
          op.push(roundNumber(Number(floats[4].toString()), 3));
          colorsArr.push(op);
          midPosition = roundNumber(Number(floats[1].toString()), 3);

          if (i < len - 1
          /*&& midPosition !== 0.5*/
          ) {
            op = [];
            nextFloats = sortedColors[i + 1];
            midPoint = Number(floats[0].toString()) + (Number(nextFloats[0].toString()) - Number(floats[0].toString())) * midPosition;
            var midPointValueR = Number(floats[2].toString()) + (Number(nextFloats[2].toString()) - Number(floats[2].toString())) * 0.5;
            var midPointValueG = Number(floats[3].toString()) + (Number(nextFloats[3].toString()) - Number(floats[3].toString())) * 0.5;
            var midPointValueB = Number(floats[4].toString()) + (Number(nextFloats[4].toString()) - Number(floats[4].toString())) * 0.5;
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
    var arr,
        arrayLength,
        count,
        lastValue,
        offsetValue,
        mergedKeys = [],
        mergedArr,
        j;

    while (i < numKeys) {
      mergedArr = [];

      if (keyframes[i].c.length < maxColors) {
        arr = keyframes[i].c;
        arrayLength = arr.length;
        lastValue = arr[arrayLength - 1];
        offsetValue = lastValue[0];
        count = 0;

        while (arrayLength + count < maxColors) {
          offsetValue -= 0.001;
          arr.splice(arrayLength - 1, 0, [offsetValue, lastValue[1], lastValue[2], lastValue[3]]);
          count += 1;
        }
      }

      for (j = 0; j < maxColors; j += 1) {
        for (var k = 0; k < 4; k += 1) {
          mergedArr.push(keyframes[i].c[j][k]);
        }
      }

      if (!hasOpacity) {
        delete keyframes[i].o;
      } else {
        if (keyframes[i].o.length < maxOpacities) {
          arr = keyframes[i].o;
          arrayLength = arr.length;
          lastValue = arr[arrayLength - 1];
          offsetValue = lastValue[0];
          count = 0;

          while (arrayLength + count < maxOpacities) {
            offsetValue -= 0.001;
            arr.splice(arrayLength - 1, 0, [offsetValue, lastValue[1], lastValue[2], lastValue[3]]);
            count += 1;
          }
        }

        for (j = 0; j < maxOpacities; j += 1) {
          for (var l = 0; l < 2; l += 1) {
            mergedArr.push(keyframes[i].o[j][l]);
          }
        }
      }

      if (numKeys <= 1) {
        mergedKeys = mergedArr;
      } else {
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

  if (typeof num === 'number') {
    return parseFloat(num.toFixed(decimals));
  } else {
    return roundArray(num, decimals);
  }
}

function roundArray(arr, decimals) {
  var i,
      len = arr.length;
  var retArray = [];

  for (i = 0; i < len; i += 1) {
    if (typeof arr[i] === 'number') {
      retArray.push(roundNumber(arr[i], decimals));
    } else {
      retArray.push(roundArray(arr[i], decimals));
    }
  }

  return retArray;
}

function sortFunction(a, b) {
  var a_0 = Number(a[0].toString());
  var b_0 = Number(b[0].toString());

  if (a_0 === b_0) {
    return 0;
  } else {
    return a_0 < b_0 ? -1 : 1;
  }
}

function vector (prop, navigationShapeTree) {
  var res = {}; // 这里是内容层，一般只有1个属性，如矩形1

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;
      navigationShapeTree.push(item.name);

      switch (matchName) {
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
}

var render = {
  psd2png: function psd2png(source, psd, path, name) {
    var helperSequenceComp = app.project.items.addComp('tempConverterComp', source.width, source.height, 1, 1, 1);
    helperSequenceComp.layers.add(source);
    $.ae2karas.addTemp(helperSequenceComp);
    var item = app.project.renderQueue.items.add(helperSequenceComp);
    $.ae2karas.addTemp(item);
    var outputModule = item.outputModule(1);
    outputModule.applyTemplate("_HIDDEN X-Factor 8 Premul");
    var fileName = path + name;
    var file = new File(fileName);

    if (file.exists) {
      file.remove();
    }

    outputModule.file = new File(fileName);

    item.onStatusChanged = function () {
      // 完成后要重命名，因为ae会追加00000到文件名末尾
      if (item.status === RQItemStatus.DONE) {
        var bug = new File(fileName + '00000');

        if (bug.exists) {
          bug.rename(name);
        }
      }
    };

    app.project.renderQueue.render();
  }
};

var uuid$1 = 0;

function recursion$1(composition, library, navigationShapeTree) {
  var name = composition.name,
      layers = composition.layers,
      width = composition.width,
      height = composition.height,
      displayStartTime = composition.displayStartTime,
      duration = composition.duration;
  $.ae2karas.error('composition: ' + name); // 是否是独奏模式

  var hasSolo;

  for (var i = 1; i <= layers.length; i++) {
    var item = layers[i];

    if (item.solo) {
      hasSolo = true;
      break;
    }
  } // 再统计哪些层被作为父级链接，asParent以索引为key是否父级链接为值，asChild以索引为key父级索引为值


  var asParent = {},
      asChild = {};

  for (var _i = 1; _i <= layers.length; _i++) {
    var _item = layers[_i];

    if (hasSolo) {
      if (!_item.solo) {
        continue;
      }
    } else {
      if (!_item.enabled) {
        continue;
      }
    }

    if (_item.parent && _item.parent.index) {
      asParent[_item.parent.index] = true;
      asChild[_item.index] = _item.parent.index;
    }
  } // 遍历分析图层，独奏时只看独奏图层，否则看可见图层


  var children = [];

  outer: for (var _i2 = 1; _i2 <= layers.length; _i2++) {
    var _item2 = layers[_i2];
    var index = _item2.index; // 根据是否独奏或可见决定是否分析或跳过，被作为父级链接的即便不可见也要统计

    if (!asParent.hasOwnProperty(index)) {
      if (hasSolo) {
        if (!_item2.solo && !_item2.isTrackMatte) {
          continue;
        }
      } else {
        if (!_item2.enabled && !_item2.isTrackMatte) {
          continue;
        }
      }
    } // mask看应用图层对象是否可见


    if (_item2.isTrackMatte) {
      for (var j = _i2 + 1; j <= layers.length; j++) {
        var item2 = layers[j];

        if (!item2.isTrackMatte) {
          if (hasSolo) {
            if (!item2.solo) {
              continue outer;
            }
          } else {
            if (!item2.enabled) {
              continue outer;
            }
          }
        }
      }
    }

    var o = parseLayer(_item2, library, navigationShapeTree, hasSolo);

    if (o) {
      // 父级打标uuid的同时，之前记录的hash也记录下来
      if (asParent.hasOwnProperty(index)) {
        asParent[index] = o.asParent = uuid$1++;
      } // mask/clip类型在被遮罩层上


      if (_i2 > 1 && o.isClip) {
        var last = children[children.length - 1];

        if (last && last.isMask) {
          last.isClip = true;
        }
      }

      children.push(o);
    }
  } // children还要遍历一遍，根据父级链接增加指向父级的字段


  for (var _i3 = 0; _i3 < children.length; _i3++) {
    var _item3 = children[_i3];
    var _index = _item3.index;

    if (asChild.hasOwnProperty(_index)) {
      _item3.asChild = asParent[asChild[_index]];
    }
  }

  children.reverse();
  return {
    type: 'div',
    name: name,
    width: width,
    height: height,
    displayStartTime: displayStartTime * 1000,
    // 开始时间码
    duration: duration * 1000,
    // 合成的总时长
    children: children
  };
}

function parseLayer(layer, library, navigationShapeTree, hasSolo) {
  var res = {
    name: layer.name,
    index: layer.index,
    width: layer.width,
    height: layer.height,
    startTime: layer.startTime * 1000,
    // 开始时间，即时间轴上本图层初始位置
    inPoint: layer.inPoint * 1000,
    // 真正开始显示时间，>= startTime，可能有前置空白不显示的一段
    outPoint: layer.outPoint * 1000,
    // 真正结束显示时间，<= duration绝对值，可能有后置空白不显示的一段
    blendingMode: layer.blendingMode,
    isMask: layer.isTrackMatte,
    isClip: layer.trackMatteType === TrackMatteType.ALPHA_INVERTED
  };
  navigationShapeTree.push(res.name); // 标明图层是否可见，也许不可见但作为父级链接也要分析

  if (hasSolo) {
    res.enabled = layer.solo || layer.isTrackMatte;
  } else {
    res.enabled = layer.enabled || layer.isTrackMatte;
  }

  $.ae2karas.warn('layer: ' + res.name);
  var geom, txt;

  for (var i = 1; i <= layer.numProperties; i++) {
    var prop = layer.property(i);

    if (prop && prop.enabled) {
      var matchName = prop.matchName;
      navigationShapeTree.push(prop.name);

      switch (matchName) {
        case 'ADBE Transform Group':
          res.transform = transformLayer(prop);
          break;

        case 'ADBE Root Vectors Group':
          // 形状图层中的内容子属性
          if (res.enabled) {
            geom = vector(prop, navigationShapeTree);
          }

          break;

        case 'ADBE Mask Parade':
          if (res.enabled) {
            res.mask = mask(prop);
          }

          break;

        case 'ADBE Text Properties':
          if (res.enabled) {
            txt = text(prop);
          }

          break;
      }

      navigationShapeTree.pop();
    }
  } // 可能是作为父级链接，如果不可见则不需要内容


  if (res.enabled) {
    var source = layer.source;

    if (geom && geom.shape && geom.shape.content && geom.shape.content.length) {
      geom.geom = true; // 特殊标识

      geom.type = 'div';
      geom.id = library.length;
      library.push(geom);
      res.assetId = geom.id;
    } else if (txt) {
      txt.text = true; // 特殊标识

      txt.type = 'span';
      txt.id = library.length;
      library.push(txt);
      res.assetId = txt.id;
    } else if (source) {
      var asset; // 图片图形等独立资源，将其解析为被link的放入library即可

      if (source instanceof FootageItem) {
        var src = source.file && source.file.fsName;
        var name = source.name;

        if (/\.psd$/.test(name)) {
          var path = src.replace(/[^\/]*\.psd$/, '');
          var newName = name.replace(/[\/.]/g, '_') + '_layer_' + layer.index + '.png';
          render.psd2png(source, src, path, newName);
          src = path + newName;
        }

        if (!/\.jpg$/.test(src) && !/\.jpeg$/.test(src) && !/\.png/.test(src) && !/\.webp/.test(src) && !/\.gif/.test(src)) {
          return;
        }

        var hasExist;

        for (var _i4 = 0; _i4 < library.length; _i4++) {
          var item = library[_i4];

          if (item.src === src && item.type === 'img') {
            asset = item;
            hasExist = true;
            break;
          }
        }

        if (!hasExist) {
          if (src) {
            asset = {
              type: 'img',
              name: name,
              width: source.width,
              height: source.height,
              src: src
            };
          } // 颜色类型没有src
          else {
            asset = {
              type: 'div',
              width: source.width,
              height: source.height
            };
          }
        }
      } // 合成，递归分析
      else if (source instanceof CompItem) {
        asset = recursion$1(source, library);
        asset.type = 'div';
      }

      if (asset) {
        asset.id = library.length;
        library.push(asset);
        res.assetId = asset.id;
      }
    }
  }

  navigationShapeTree.pop();
  return res;
}

function mask(prop) {
  var res = {};

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      if (matchName === 'ADBE Mask Atom') {
        if (item.maskMode !== MaskMode.NONE) {
          res.enabled = true;
        }

        res.list = transformMask(item);
        res.mode = item.maskMode;
        res.inverted = item.inverted;
      }
    }
  }

  return res;
}

function text(prop) {
  var res = {};

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
        case 'ADBE Text Document':
          var value = item.value;
          res.content = {
            fillColor: value.fillColor,
            font: value.font,
            fontFamily: value.fontFamily,
            fontStyle: value.fontStyle,
            fontSize: value.fontSize,
            leading: value.leading,
            baselineLocs: value.baselineLocs,
            text: value.text
          }; // 固定已知尺寸时有

          if (value.boxText) {
            res.content.size = value.boxTextSize;
            res.content.position = value.boxTextPos;
          }

          break;
      }
    }
  }

  return res;
}

function parse$1 (composition) {
  $.ae2karas.error('parse'); // 递归遍历合成，转换ae的图层为普通js对象

  var workAreaStart = composition.workAreaStart,
      workAreaDuration = composition.workAreaDuration;
  workAreaStart *= 1000;
  workAreaDuration *= 1000;
  $.ae2karas.log('workArea: ' + workAreaStart + ',' + workAreaDuration);
  var library = [],
      navigationShapeTree = [];
  var result = recursion$1(composition, library, navigationShapeTree);
  $.ae2karas.log(result);
  $.ae2karas.log(library);
  return {
    workAreaStart: workAreaStart,
    workAreaDuration: workAreaDuration,
    result: result,
    library: library
  };
}

var path = {
  parse: function parse(vertices, inTangents, outTangents, closed, x1, y1, x2, y2) {
    if (x1 === undefined) {
      x1 = x2 = vertices[0][0];
      y1 = y2 = vertices[0][1]; // 控制点是相对于顶点的坐标

      var it = inTangents[0],
          ot = outTangents[0];

      if (it[0]) {
        x1 = Math.max(x1, x1 + it[0]);
        x2 = Math.min(x2, x1 + it[0]);
      }

      if (it[1]) {
        y1 = Math.max(y1, y1 + it[1]);
        y2 = Math.min(y2, y1 + it[1]);
      }

      if (ot[0]) {
        x1 = Math.max(x1, x1 + ot[0]);
        x2 = Math.min(x2, x1 + ot[0]);
      }

      if (ot[1]) {
        y1 = Math.max(y1, y1 + ot[1]);
        y2 = Math.min(y2, y1 + ot[1]);
      } // 循环获取极值


      for (var i = 1, len = vertices.length; i < len; i++) {
        var item = vertices[i];
        x1 = Math.max(x1, item[0]);
        y1 = Math.max(y1, item[1]);
        x2 = Math.min(x2, item[0]);
        y2 = Math.min(y2, item[1]); // 控制点是相对于顶点的坐标

        var _it = inTangents[i],
            _ot = outTangents[i];

        if (_it[0]) {
          x1 = Math.max(x1, item[0] + _it[0]);
          x2 = Math.min(x2, item[0] + _it[0]);
        }

        if (_it[1]) {
          y1 = Math.max(y1, item[1] + _it[1]);
          y2 = Math.min(y2, item[1] + _it[1]);
        }

        if (_ot[0]) {
          x1 = Math.max(x1, item[0] + _ot[0]);
          x2 = Math.min(x2, item[0] + _ot[0]);
        }

        if (_ot[1]) {
          y1 = Math.max(y1, item[1] + _ot[1]);
          y2 = Math.min(y2, item[1] + _ot[1]);
        }
      }
    }

    var w = x1 - x2,
        h = y1 - y2;
    var pts = [],
        cts = [];

    for (var _i = 0, _len = vertices.length; _i < _len; _i++) {
      var _item = vertices[_i];
      pts.push([(_item[0] - x2) / w, (_item[1] - y2) / h]);
      var _it2 = inTangents[_i],
          _ot2 = outTangents[_i]; // 上一个顶点到本顶点，即便控制点为空也要填补为顶点数据，为2帧之间动画过渡考虑

      var j = _i - 1;

      if (j === -1) {
        j = _len - 1;
      }

      cts[j] = cts[j] || [];
      cts[j].push((vertices[_i][0] + _it2[0] - x2) / w);
      cts[j].push((vertices[_i][1] + _it2[1] - y2) / h); // 本顶点到下一个顶点，最后一个比较特殊是到第一个，需要调整顺序

      cts[_i] = cts[_i] || [];
      var x = (vertices[_i][0] + _ot2[0] - x2) / w,
          y = (vertices[_i][1] + _ot2[1] - y2) / h;

      if (_i === _len - 1) {
        cts[_i].unshift(y);

        cts[_i].unshift(x);
      } else {
        cts[_i].push(x);

        cts[_i].push(y);
      }
    }

    if (closed) {
      pts.push(pts[0].slice(0));
    }

    return {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      width: w,
      height: h,
      points: pts,
      controls: cts
    };
  },
  rect2polyline: function rect2polyline(width, height, roundness) {
    roundness = roundness || 0;
    var r = Math.min(width, height) * 0.5;
    roundness = Math.min(roundness, r);
    var pts = [],
        cts = [];

    if (roundness && roundness > 0) {
      var h = roundness * 0.5522847498307936;
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
    } else {
      pts.push([1, 0]);
      pts.push([1, 1]);
      pts.push([0, 1]);
      pts.push([0, 0]);
      pts.push([1, 0]);
    }

    return {
      points: pts,
      controls: cts
    };
  },
  ellipse2polyline: function ellipse2polyline() {
    var pts = [],
        cts = [];
    var rx = 0.5 * 0.5522847498307936,
        ry = 0.5 * 0.5522847498307936;
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
      controls: cts
    };
  }
};

/**
 * 2个及以上的关键帧，获取区间，有可能有超过范围的无效关键帧，需滤除
 * 也有可能不及工作区间，需补充首尾，和原有首尾一样复制一个出来对齐区间
 * 也有可能虽然在范围外，但范围上无关键帧，需截取至范围内，由每个特效传入截取回调
 * @param list
 * @param begin
 * @param duration
 * @param reducer 当关键帧范围在工作区间外时，每个特效传入的截取函数
 * @returns {(number|number)[]}
 */

function getAreaList(list, begin, duration, reducer) {
  var len = list.length;
  var startIndex = 0,
      endIndex = len - 1; // 在区间外围的如果只有1帧则需包括，多余的去除，正好则符合，包含则需填补

  for (var i = 0; i < len; i++) {
    var item = list[i];

    if (item.time < begin) {
      startIndex = i;
    } else if (item.time > begin) {
      break;
    } else {
      startIndex = i;
      break;
    }
  } // 结尾同上


  for (var _i = len - 1; _i >= 0; _i--) {
    var _item = list[_i];

    if (_item.time < begin + duration) {
      break;
    } else if (_item.time > begin + duration) {
      endIndex = _i;
    } else {
      endIndex = _i;
      break;
    }
  }

  if (startIndex > 0 || endIndex < len - 1) {
    list = list.slice(startIndex, endIndex + 1);
  } // 补齐首帧，当关键帧在工作区间内的时候


  var first = list[0];

  if (first.time > begin) {
    var o = {
      time: begin,
      value: Array.isArray(first.value) ? first.value.slice(0) : first.value
    }; // translatePath特殊处理，前补第一帧转为translate

    if (Array.isArray(first.value) && first.value.length === 8) {
      o.value = first.value.slice(0, 2);
    }

    list.unshift(o);
  } // 截取首帧部分
  else if (first.time < begin) {
    var next = list[1];
    var percent = (begin - first.time) / (next.time - first.time);
    first.time = begin;
    first.value = reducer(first.value, next.value, percent, true);

    if (first.easing) {
      var points = sliceBezier([[0, 0], [first.easing[0], first.easing[1]], [first.easing[2], first.easing[3]], [1, 1]].reverse(), percent).reverse();
      first.easing = [points[1][0], points[1][1], points[2][0], points[2][1]];
    }
  } // 截取尾帧部分，同上


  var last = list[list.length - 1];

  if (last.time > begin + duration) {
    var prev = list[list.length - 2];

    var _percent = (begin + duration - prev.time) / (last.time - prev.time);

    last.time = begin + duration;
    last.value = reducer(prev.value, last.value, _percent);

    if (prev.easing) {
      var _points = sliceBezier([[0, 0], [prev.easing[0], prev.easing[1]], [prev.easing[2], prev.easing[3]], [1, 1]], _percent);

      prev.easing = [_points[1][0], _points[1][1], _points[2][0], _points[2][1]];
    }
  } // 补齐尾帧，同上
  else if (last.time < begin + duration) {
    var _o = {
      time: begin + duration,
      value: Array.isArray(last.value) ? last.value.slice(0) : last.value
    };
    list.push(_o);
  }

  return list;
}
/**
 * 百分比截取贝塞尔中的一段，t为[0, 1]
 * @param points
 * @param t
 */


function sliceBezier(points, t) {
  var p1, p2, p3, p4;

  if (points.length === 8) {
    p1 = points.slice(0, 2);
    p2 = points.slice(2, 4);
    p3 = points.slice(4, 8);
    p4 = points.slice(6, 8);
  } else {
    p1 = points[0];
    p2 = points[1];
    p3 = points[2];
    p4 = points[3];
  }

  var x1 = p1[0],
      y1 = p1[1];
  var x2 = p2[0],
      y2 = p2[1];
  var x3 = p3[0],
      y3 = p3[1];
  var x12 = (x2 - x1) * t + x1;
  var y12 = (y2 - y1) * t + y1;
  var x23 = (x3 - x2) * t + x2;
  var y23 = (y3 - y2) * t + y2;
  var x123 = (x23 - x12) * t + x12;
  var y123 = (y23 - y12) * t + y12;

  if (points.length === 4 || points.length === 8) {
    var x4 = p4[0],
        y4 = p4[1];
    var x34 = (x4 - x3) * t + x3;
    var y34 = (y4 - y3) * t + y3;
    var x234 = (x34 - x23) * t + x23;
    var y234 = (y34 - y23) * t + y23;
    var x1234 = (x234 - x123) * t + x123;
    var y1234 = (y234 - y123) * t + y123;

    if (points.length === 8) {
      return [x1, y1, x12, y12, x123, y123, x1234, y1234];
    }

    return [[x1, y1], [x12, y12], [x123, y123], [x1234, y1234]];
  } else if (points.length === 3) {
    return [[x1, y1], [x12, y12], [x123, y123]];
  }
}

function transformOrigin(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      transformOrigin: list[0][0] + ' ' + list[0][1]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return [prev[0] + (next[0] - prev[0]) * percent, prev[1] + (next[1] - prev[1]) * percent];
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        transformOrigin: item.value[0] + ' ' + item.value[1],
        easing: item.easing
      });
    }
  }

  return res;
}
function transformOpacity(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      opacity: list[0] * 0.01
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return prev + (next - prev) * percent;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        opacity: item.value * 0.01,
        easing: item.easing
      });
    }
  }

  return res;
}
function transformPosition(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      translateX: list[0][0],
      translateY: list[0][1]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent, isStart) {
      // 特殊的translatePath曲线动画
      if (prev.length === 8) {
        if (isStart) {
          var points = [];

          for (var i = 0, len = prev.length; i < len; i++) {
            var item = prev[i];
            points.push(item);
          }

          points = sliceBezier(points.reverse(), percent);
          return points.reverse();
        } else {
          return sliceBezier(prev, percent);
        }
      }

      return [prev[0] + (next[0] - prev[0]) * percent, prev[1] + (next[1] - prev[1]) * percent, prev[2] + (next[2] - prev[2]) * percent];
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      var o = {
        offset: (item.time - begin) / duration,
        easing: item.easing
      };

      if (item.value.length === 8) {
        o.translatePath = item.value;
      } else {
        o.translateX = item.value[0];
        o.translateY = item.value[1];
      }

      res.value.push(o);
    }
  }

  return res;
}
function translateXY(list, begin, duration, key) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    var o = {};
    o[key] = list[0];
    res.value.push(o);
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent, isStart) {
      return prev + (next - prev) * percent;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      var _o2 = {
        offset: (item.time - begin) / duration,
        easing: item.easing
      };
      _o2[key] = item.value;
      res.value.push(_o2);
    }
  }

  return res;
}
function transformRotateX(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      rotateX: -list[0]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return prev + (next - prev) * percent;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        rotateX: -item.value,
        easing: item.easing
      });
    }
  }

  return res;
}
function transformRotateY(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      rotateY: -list[0]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return prev + (next - prev) * percent;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        rotateY: -item.value,
        easing: item.easing
      });
    }
  }

  return res;
}
function transformRotateZ(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      rotateZ: list[0]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return prev + (next - prev) * percent;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        rotateZ: item.value,
        easing: item.easing
      });
    }
  }

  return res;
}
function transformScale(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    var v = {
      scaleX: list[0][0] * 0.01,
      scaleY: list[0][1] * 0.01
    };

    if (list[0].length > 2) {
      v.scaleZ = list[0][2] * 0.01;
    }

    res.value.push(v);
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return [prev[0] + (next[0] - prev[0]) * percent, prev[1] + (next[1] - prev[1]) * percent, prev[2] + (next[2] - prev[2]) * percent];
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      var _v = {
        offset: (item.time - begin) / duration,
        scaleX: item.value[0] * 0.01,
        scaleY: item.value[1] * 0.01,
        easing: item.easing
      };

      if (item.value.length > 2) {
        _v.scaleZ = item.value[2] * 0.01;
      }

      res.value.push(_v);
    }
  }

  return res;
}
function transformPath(list, begin, duration, isEnd) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    var v = {};

    if (isEnd) {
      v.end = list[0] * 0.01;
    } else {
      v.start = list[0] * 0.01;
    }

    res.value.push(v);
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return (prev + (next - prev) * percent) * 0.01;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      var _v2 = {
        offset: (item.time - begin) / duration,
        easing: item.easing
      };

      if (isEnd) {
        _v2.end = item.value * 0.01;
      } else {
        _v2.start = item.value * 0.01;
      }

      res.value.push(_v2);
    }
  }

  return res;
}
function transformPoints(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    var _list$ = list[0],
        vertices = _list$.vertices,
        inTangents = _list$.inTangents,
        outTangents = _list$.outTangents,
        closed = _list$.closed;
    var o = path.parse(vertices, inTangents, outTangents, closed);
    res.value.push({
      points: o.points,
      controls: o.controls
    });
    res.data = o;
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent, isStart) {
      var vertices1 = prev.vertices1,
          inTangents1 = prev.inTangents1,
          outTangents1 = prev.outTangents1,
          closed = prev.closed;
      var vertices2 = next.vertices2,
          inTangents2 = next.inTangents2,
          outTangents2 = next.outTangents2;
      var vertices = [],
          inTangents = [],
          outTangents = [];

      for (var i = 0, len = vertices1.len; i < len; i++) {
        var p = vertices1[i],
            n = vertices2[i];
        var pIn = inTangents1[(i + 1) % len],
            nIn = inTangents2[(i + 1) % len];
        var pOut = outTangents1[i],
            nOut = outTangents2[i]; // 直线切割或贝塞尔切割

        if (pIn[0] === 0 && pIn[1] === 0 && nIn[0] === 0 && nIn[1] === 0 && pOut[0] === 0 && pOut[1] === 0 && nOut[0] === 0 && nOut[1] === 0) {
          vertices.push([p[0] + (n[0] - p[0]) * percent, p[1] + (n[1] - p[1]) * percent]);
          inTangents.push([0, 0]);
          outTangents.push([0, 0]);
        } else {
          var arr = [p, pOut, pIn, n];

          if (isStart) {
            arr.reverse();
          }

          var s = sliceBezier(arr, percent);
          vertices.push(s[3]);

          if (isStart) {
            inTangents.push(s[1]);
            outTangents.push(s[2]);
          } else {
            inTangents.push(s[2]);
            outTangents.push(s[1]);
          }
        }
      }

      return {
        vertices: vertices,
        inTangents: inTangents,
        outTangents: outTangents,
        closed: closed
      };
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      var _item$value = item.value,
          _vertices = _item$value.vertices,
          _inTangents = _item$value.inTangents,
          _outTangents = _item$value.outTangents,
          _closed = _item$value.closed;

      var _o3 = void 0;

      if (i === 0) {
        _o3 = path.parse(_vertices, _inTangents, _outTangents, _closed);
        res.data = _o3;
      } else {
        _o3 = path.parse(_vertices, _inTangents, _outTangents, _closed, res.data.x1, res.data.y1, res.data.x2, res.data.y2);
      }

      res.value.push({
        offset: (item.time - begin) / duration,
        points: _o3.points,
        controls: _o3.controls
      });
    }
  }

  return res;
}
function transformFill(fill, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (fill.color.length === 1) {
    var first = fill.color[0];
    var v = [parseInt(first[0] * 255), parseInt(first[1] * 255), parseInt(first[2] * 255), first[3]];

    if (fill.opacity[0] < 100) {
      v[3] *= fill.opacity[0] * 0.01;
    }

    res.value.push({
      fill: [v]
    });
  } else {
    var len = fill.color[0].length;
    var list = getAreaList(fill.color, begin, duration, function (prev, next, percent) {
      var arr = [];

      for (var i = 0; i < len; i++) {
        arr[i] = prev[i] + (next[i] - prev[i]) * percent;
      }

      return arr;
    });

    for (var i = 0, _len = list.length; i < _len; i++) {
      var item = list[i];
      var _v3 = [parseInt(item[0] * 255), parseInt(item[1] * 255), parseInt(item[2] * 255), item[3]];

      if (fill.opacity[i] < 100) {
        _v3[3] *= fill.opacity[i] * 0.01;
      }

      res.value.push({
        offset: (item.time - begin) / duration,
        fill: [_v3]
      });
    }
  }

  return res;
}
function transformStroke(stroke, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (stroke.color.length === 1) {
    var first = stroke.color[0];
    var v = [parseInt(first[0] * 255), parseInt(first[1] * 255), parseInt(first[2] * 255), first[3]];

    if (stroke.opacity[0] < 100) {
      v[3] *= stroke.opacity[0] * 0.01;
    }

    res.value.push({
      stroke: [v]
    });
  } else {
    var list = getAreaList(stroke.color, begin, duration, function (prev, next, percent) {
      return prev + (next - prev) * percent;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      var _v4 = [parseInt(item[0] * 255), parseInt(item[1] * 255), parseInt(item[2] * 255), item[3]];

      if (stroke.opacity[i] < 100) {
        _v4[3] *= stroke.opacity[i] * 0.01;
      }

      res.value.push({
        offset: (item.time - begin) / duration,
        stroke: [_v4]
      });
    }
  }

  return res;
}
function transformStrokeWidth(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      strokeWidth: list
    });
  } else {
    var len = list[0].length;
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      var arr = [];

      for (var i = 0; i < len; i++) {
        arr[i] = prev[i] + (next[i] - prev[i]) * percent;
      }

      return arr;
    });

    for (var i = 0, _len2 = list.length; i < _len2; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        strokeWidth: item.value
      });
    }
  }

  return res;
}
function transformLineJoin(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    var arr;

    if (list[0] === 1) {
      arr = ['miter'];
    } else if (list[0] === 2) {
      arr = ['round'];
    } else {
      arr = ['bevel'];
    }

    res.value.push({
      strokeLinejoin: arr
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent, isFirst) {
      return isFirst ? prev : next;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      var _arr = [];

      for (var _i2 = 0, _len3 = item.value.length; _i2 < _len3; _i2++) {
        var item2 = item.value[_i2];

        if (item2 === 1) {
          _arr.push('miter');
        } else if (item2 === 2) {
          _arr.push('round');
        } else {
          _arr.push('bevel');
        }
      }

      res.value.push({
        offset: (item.time - begin) / duration,
        strokeLinejoin: _arr
      });
    }
  }

  return res;
}
function transformMiterLimit(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      strokeWidth: list
    });
  } else {
    var len = list[0].length;
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      var arr = [];

      for (var i = 0; i < len; i++) {
        arr[i] = prev[i] + (next[i] - prev[i]) * percent;
      }

      return arr;
    });

    for (var i = 0, _len4 = list.length; i < _len4; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        strokeWidth: item.value
      });
    }
  }

  return res;
}
function transformSize(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards',
      iterations: 1
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      size: list[0]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return [prev[0] + (next[0] - prev[0]) * percent, prev[1] + (next[1] - prev[1]) * percent];
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        size: item.value
      });
    }
  }

  return res;
}

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
  var name = data.name,
      width = data.width,
      height = data.height,
      inPoint = data.inPoint,
      outPoint = data.outPoint,
      asParent = data.asParent,
      asChild = data.asChild;
  var begin = start + offset + displayStartTime; // 图层在工作区外特殊处理，取最近的一帧内容

  if (inPoint >= begin + duration || outPoint <= begin) {
    return null;
  }

  var res = {
    name: name,
    tagName: 'div',
    props: {
      style: {
        position: 'absolute',
        width: width,
        height: height // overflow: 'hidden',

      }
    },
    children: [],
    animate: [],
    asParent: asParent,
    asChild: asChild
  };
  parseAnimate(res, data, start, duration, displayStartTime, offset, true, false);
  return res;
}

function parseAnimate(res, data, start, duration, displayStartTime, offset, isDirect, isGeom) {
  var width = data.width,
      height = data.height,
      transform = data.transform; // 分别分析每个变换，过程很相似，当为单帧时需合并到init.style，多帧第一帧需合并且置空

  var anchorPoint = transform.anchorPoint,
      opacity = transform.opacity,
      position = transform.position,
      position_0 = transform.position_0,
      position_1 = transform.position_1,
      rotateX = transform.rotateX,
      rotateY = transform.rotateY,
      rotateZ = transform.rotateZ,
      scale = transform.scale;
  var begin2 = start - offset - displayStartTime;
  var init = isDirect ? res.props : res.init;

  if (!isGeom && Array.isArray(anchorPoint) && anchorPoint.length) {
    var t = transformOrigin(anchorPoint, begin2, duration);
    var first = t.value[0];
    var v = first.transformOrigin.split(' ');
    v[0] = parseFloat(v[0]);
    v[1] = parseFloat(v[1]);

    if (v[0] !== width * 0.5 || v[1] !== height * 0.5) {
      init.style.transformOrigin = first.transformOrigin;
    }

    if (t.value.length > 1) {
      t.value[0] = {
        offset: 0,
        easing: first.easing
      }; // tfo的每个动画需考虑对坐标的影响

      for (var i = 1, len = t.value.length; i < len; i++) {
        var item = t.value[i];
        var tfo = item.transformOrigin.split(' ');
        tfo[0] = parseFloat(tfo[0]);
        tfo[1] = parseFloat(tfo[1]);
        item.left = -tfo[0];
        item.top = -tfo[1];
      }

      res.animate.push(t);
    } // ae中位置相对于anchor，而不是默认左上角原点，因此有个位置计算


    if (v[0]) {
      init.style.left = -v[0];
    }

    if (v[1]) {
      init.style.top = -v[1];
    }
  }

  if (Array.isArray(opacity) && opacity.length) {
    var _t = transformOpacity(opacity, begin2, duration);

    var _first = _t.value[0];

    if (_first.opacity !== 1) {
      init.style.opacity = _first.opacity;
    }

    if (_t.value.length > 1) {
      _t.value[0] = {
        offset: 0,
        easing: _first.easing
      };
      res.animate.push(_t);
    }
  } // position要考虑x/y拆开


  var translateAbbr = true;

  if (Array.isArray(position_0) && position_0.length > 1) {
    translateAbbr = false;
  }

  if (Array.isArray(position_1) && position_1.length > 1) {
    translateAbbr = false;
  }

  if (Array.isArray(position) && position.length && translateAbbr) {
    var _t2 = transformPosition(position, begin2, duration);

    var _first2 = _t2.value[0];

    if (_first2.translatePath) {
      init.style.translateX = _first2.translatePath[0];
      init.style.translateY = _first2.translatePath[1];
    } else {
      if (_first2.translateX) {
        init.style.translateX = _first2.translateX;
      }

      if (_first2.translateY) {
        init.style.translateY = _first2.translateY;
      }
    }

    if (_t2.value.length > 1) {
      if (!_first2.translatePath) {
        _t2.value[0] = {
          offset: 0,
          easing: _first2.easing
        };
      }

      res.animate.push(_t2);
    }
  } else {
    if (Array.isArray(position_0) && position_0.length) {
      var _t3 = translateXY(position_0, begin2, duration, 'translateX');

      var _first3 = _t3.value[0];

      if (_first3.translateX) {
        init.style.translateX = _first3.translateX;
      }

      if (_t3.value.length > 1) {
        _t3.value[0] = {
          offset: 0,
          easing: _first3.easing
        };
        res.animate.push(_t3);
      }
    }

    if (Array.isArray(position_1) && position_1.length) {
      var _t4 = translateXY(position_1, begin2, duration, 'translateY');

      var _first4 = _t4.value[0];

      if (_first4.translateY) {
        init.style.translateY = _first4.translateY;
      }

      if (_t4.value.length > 1) {
        _t4.value[0] = {
          offset: 0,
          easing: _first4.easing
        };
        res.animate.push(_t4);
      }
    }
  }

  var is3d;

  if (Array.isArray(rotateX) && rotateX.length) {
    var _t5 = transformRotateX(rotateX, begin2, duration);

    var _first5 = _t5.value[0];

    if (_first5.rotateX) {
      init.style.rotateX = _first5.rotateX;
      is3d = true;
    }

    if (_t5.value.length > 1) {
      _t5.value[0] = {
        offset: 0,
        easing: _first5.easing
      };
      res.animate.push(_t5);
      is3d = true;
    }
  }

  if (Array.isArray(rotateY) && rotateY.length) {
    var _t6 = transformRotateY(rotateY, begin2, duration);

    var _first6 = _t6.value[0];

    if (_first6.rotateY) {
      init.style.rotateY = _first6.rotateY;
      is3d = true;
    }

    if (_t6.value.length > 1) {
      _t6.value[0] = {
        offset: 0,
        easing: _first6.easing
      };
      res.animate.push(_t6);
      is3d = true;
    }
  }

  if (Array.isArray(rotateZ) && rotateZ.length) {
    var _t7 = transformRotateZ(rotateZ, begin2, duration);

    var _first7 = _t7.value[0];

    if (_first7.rotateZ) {
      init.style.rotateZ = _first7.rotateZ;
      is3d = true;
    }

    if (_t7.value.length > 1) {
      _t7.value[0] = {
        offset: 0,
        easing: _first7.easing
      };
      res.animate.push(_t7);
      is3d = true;
    }
  }

  if (is3d) {
    // path没有width和height，在处理geom时会添加上
    init.style.perspective = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
  }

  if (Array.isArray(scale) && scale.length) {
    var _t8 = transformScale(scale, begin2, duration);

    var _first8 = _t8.value[0];

    if (_first8.scaleX !== 1) {
      init.style.scaleX = _first8.scaleX;
    }

    if (_first8.scaleY !== 1) {
      init.style.scaleY = _first8.scaleY;
    }

    if (_first8.scaleZ !== 1) {
      init.style.scaleZ = _first8.scaleZ;
    }

    if (_t8.value.length > 1) {
      _t8.value[0] = {
        offset: 0,
        easing: _first8.easing
      };
      res.animate.push(_t8);
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
  if (!data.enabled) {
    return null;
  }

  var name = data.name,
      assetId = data.assetId,
      startTime = data.startTime,
      inPoint = data.inPoint,
      outPoint = data.outPoint,
      blendingMode = data.blendingMode,
      isMask = data.isMask,
      isClip = data.isClip;

  if (assetId === undefined || assetId === null) {
    return null;
  }

  var begin = start + offset + displayStartTime;
  inPoint += offset + displayStartTime;
  outPoint += offset + displayStartTime; // 图层在工作区外可忽略

  if (inPoint >= begin + duration || outPoint <= begin) {
    return null;
  }

  var res = {
    name: name
  };
  res.libraryId = parse(library, assetId, newLib, start, duration, displayStartTime, offset + startTime);
  res.init = {
    style: {}
  }; // isMask代表是否是遮罩，isClip需在isMask的基础上判断，因为被遮罩层存储isClip值再赋给遮罩层

  if (isMask) {
    if (isClip) {
      res.init.clip = true;
    } else {
      res.init.mask = true;
    }
  } // 混合模式


  switch (blendingMode) {
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

  res.animate = []; // 特殊的visibility动画，如果图层可见在工作区间内，需要有动画，否则可以无视

  if (inPoint > begin || outPoint < begin + duration) {
    var v = {
      value: [],
      options: {
        duration: duration,
        fill: 'forwards',
        iterations: 1
      }
    }; // 开头不可见，默认init的style

    if (inPoint > begin) {
      res.init.style.visibility = 'hidden';
      res.init.style.pointerEvents = 'none';
      v.value.push({
        offset: 0
      });
      v.value.push({
        offset: inPoint / duration,
        visibility: 'inherit',
        pointerEvents: 'auto'
      });
    } else {
      v.value.push({
        offset: 0,
        visibility: 'inherit',
        pointerEvents: 'auto'
      });
    } // 结尾计算


    if (outPoint < begin + duration) {
      // 可能是第一帧但offset不为0，不用担心karas会补充空首帧
      v.value.push({
        offset: outPoint / duration,
        visibility: 'hidden',
        pointerEvents: 'none'
      }); // 默认不是隐藏需补结束帧为隐藏，否则karas会填补空关键帧

      if (inPoint <= begin) {
        v.value.push({
          offset: 1,
          visibility: 'hidden',
          pointerEvents: 'none'
        });
      }
    } else {
      v.value.push({
        offset: 1,
        visibility: 'inherit',
        pointerEvents: 'auto'
      });
    }

    res.animate.push(v);
  }

  parseAnimate(res, data, start, duration, displayStartTime, offset, false, false); // text的位置修正，init的left/top会覆盖props的，多嵌套一层也可以但麻烦

  var lib = newLib[res.libraryId];

  if (lib && lib.tagName === 'span') {
    res.init.style.left = res.init.style.left || 0;
    res.init.style.left += lib.props.style.left || 0;
    res.init.style.top = res.init.style.top || 0;
    res.init.style.top += lib.props.style.top || 0;
  } // 父级链接塞进父级作为唯一children，有可能父级是递归嵌套的，需到达最里层


  if (data.hasOwnProperty('asChild')) {
    var asChild = data.asChild;

    if (parentLink.hasOwnProperty(asChild)) {
      var div = $.ae2karas.JSON.stringify(parentLink[asChild]);
      div = $.ae2karas.JSON.parse(div);
      var target = div;
      target.asParent = target.asChild = undefined;

      while (target.children.length) {
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
  var data = library[assetId];
  var type = data.type,
      name = data.name,
      src = data.src,
      width = data.width,
      height = data.height,
      children = data.children,
      geom = data.geom,
      text = data.text;
  var res = {
    id: -1,
    // 占位符
    name: name,
    tagName: type,
    props: {
      style: {
        position: 'absolute',
        width: width,
        height: height // overflow: 'hidden',

      }
    }
  };

  if (type === 'div' && !geom && !text) {
    res.props.style.overflow = 'hidden';
  } // 矢量图层特殊解析，添加


  if (geom) {
    parseGeom(res, data, start, duration, displayStartTime, offset);
  } else if (text) {
    var content = data.content;
    res.props.style.color = [parseInt(content.fillColor[0] * 255), parseInt(content.fillColor[1] * 255), parseInt(content.fillColor[2] * 255)];
    res.props.style.fontFamily = content.fontFamily;
    res.props.style.fontSize = content.fontSize; // res.props.style.fontStyle = content.fontStyle;
    // res.props.style.lineHeight = (content.fontSize + content.leading) / content.fontSize;

    res.props.style.lineHeight = 1.2;
    res.children = [content.text]; // 对齐方式

    var baselineLocs = content.baselineLocs;
    var left = 0,
        right = 0;

    for (var i = 0, len = baselineLocs.length; i < len; i += 4) {
      left = Math.min(left, baselineLocs[i]);
      right = Math.max(right, baselineLocs[i + 2]);
    }

    if (content.position) {
      res.props.style.left = content.position[0];
      res.props.style.top = content.position[1];
    } else {
      if (left) {
        res.props.style.left = left;
        res.props.style.width = right - left;
        res.props.style.textAlign = 'center';
      }

      res.props.style.top = -content.fontSize - baselineLocs[1];
    }
  } // 图片无children
  else if (type === 'img') {
    res.props.src = src;
  } else if (Array.isArray(children)) {
    res.children = [];
    parseChildren(res, children, library, newLib, start, duration, displayStartTime, offset);
  }

  res.id = newLib.length;
  newLib.push(res);
  return res.id;
}

function parseChildren(res, children, library, newLib, start, duration, displayStartTime, offset) {
  if (Array.isArray(children)) {
    // 先一遍解析父级链接，因为父级可能不展示或者只需要父级一层不递归解析父级的children
    var parentLink = {};

    for (var i = 0, len = children.length; i < len; i++) {
      var item = children[i];

      if (item.hasOwnProperty('asParent')) {
        parentLink[item.asParent] = preParse(item, library, start, duration, displayStartTime, offset);
      }
    } // 因为父级链接可能产生递归嵌套，需要再循环处理一遍parentLink


    for (var _i in parentLink) {
      if (parentLink.hasOwnProperty(_i)) {
        var _item = parentLink[_i];
        var asChild = _item.asChild;

        while (asChild !== undefined && parentLink[asChild]) {
          var parent = $.ae2karas.JSON.stringify(parentLink[asChild]);
          parent = $.ae2karas.JSON.parse(parent);
          parent.children.push(_item);
          _item = parent;
          asChild = parent.asChild;
        }

        if (_item !== parentLink[_i]) {
          parentLink[_i] = _item;
        }
      }
    } // 再普通解析，遇到父级链接特殊处理


    for (var _i2 = 0, _len = children.length; _i2 < _len; _i2++) {
      var _item2 = children[_i2];
      var temp = recursion(_item2, library, newLib, start, duration, displayStartTime, offset, parentLink);

      if (temp) {
        res.children.push(temp); // ppt应该放在父层，如果有父级链接，则放在其上

        if (temp.init && temp.init.style && temp.init.style.perspective) {
          res.props.style.perspective = temp.init.style.perspective || undefined;
          temp.init.style.perspective = undefined;
        }

        if (temp.children && temp.children.length === 1) {
          var t = temp.children[0];

          if (t.init && t.init.style && t.init.style.perspective) {
            temp.props.style.perspective = t.init.style.perspective || undefined;
            t.init.style.perspective = undefined;
          }
        } // 有mask分析mask，且要注意如果有父级链接不能直接存入当前children，要下钻


        if (_item2.mask && _item2.mask.enabled) {
          var m = parseMask(_item2, temp, start, duration, displayStartTime, offset);
          var target = res;

          while (temp.children && temp.children.length === 1) {
            target = temp;
            temp = temp.children[0];
          }

          target.children.push(m); // 特殊的地方，被遮罩的可能有init样式，mask需同等赋值

          var style = target.children[0].init.style;

          if (style) {
            for (var _i3 in style) {
              if (style.hasOwnProperty(_i3) && {
                'scaleX': true,
                'scaleY': true
              }.hasOwnProperty(_i3)) {
                m.props.style[_i3] = style[_i3];
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
  var _data$shape = data.shape,
      content = _data$shape.content,
      fill = _data$shape.fill,
      gFill = _data$shape.gFill,
      stroke = _data$shape.stroke,
      transform = _data$shape.transform,
      trim = data.trim;
  var begin2 = start - offset - displayStartTime; // 矢量可能有多个，但样式共用一个

  var children = [];
  var len = content.length;

  if (!len) {
    return;
  } // 由于动画的特殊性，无法直接用矢量标签，需嵌套一个中间层div


  var child = {
    tagName: 'div',
    props: {
      style: {
        position: 'absolute'
      }
    },
    children: children,
    animate: []
  };

  for (var i = 0, _len2 = content.length; i < _len2; i++) {
    var item = content[i];
    var type = item.type;
        item.direction;
        var size = item.size,
        position = item.position,
        roundness = item.roundness,
        points = item.points;
    var f = void 0; // 由于动画的特殊性，无法直接用矢量标签，需嵌套一个中间层div

    var $geom = {
      tagName: '$polyline',
      props: {
        style: {
          position: 'absolute'
        }
      },
      animate: []
    };
    children.push($geom); // 分类处理矢量

    if (type === 'rect' || type === 'ellipse') {
      var t = transformSize(size, begin2, duration);
      var first = t.value[0];
      $geom.props.style.width = first.size[0];
      $geom.props.style.height = first.size[1];

      if (t.value.length > 1) {
        t.value[0] = {
          offset: 0
        }; // 用缩放代替尺寸变化

        for (var _i4 = 1, _len3 = t.value.length; _i4 < _len3; _i4++) {
          var _item3 = t.value[_i4];
          var _size = _item3.size;
          _item3.size = undefined;
          _item3.scaleX = _size[0] / first.size[0];
          _item3.scaleY = _size[1] / first.size[1];
        }

        $geom.animate.push(t);
      }

      if (type === 'rect') {
        var o = path.rect2polyline(first.size[0], first.size[1], roundness[0]);
        $geom.props.points = o.points;
        $geom.props.controls = o.controls;
      } else if (type === 'ellipse') {
        var _o = path.ellipse2polyline();

        $geom.props.points = _o.points;
        $geom.props.controls = _o.controls;
      }
    } else if (type === 'star') ; else if (type === 'path') {
      var _t9 = transformPoints(points, begin2, duration);

      var d = _t9.data; // path特殊没尺寸，3d等计算ppt需赋值

      $geom.props.style.width = data.shape.width = d.width;
      $geom.props.style.height = data.shape.height = d.height; // path的特殊位置计算，因为ae中尺寸为0

      $geom.props.style.left = d.x2;
      $geom.props.style.top = d.y2;
      _t9.data = undefined;
      var _first9 = _t9.value[0];
      $geom.props.points = _first9.points;
      $geom.props.controls = _first9.controls;

      if (_t9.value.length > 1) {
        _t9.value[0] = {
          offset: 0
        };
        $geom.animate.push(_t9);
      }
    } // path没有position


    if (position && position.length) {
      var _t10 = transformPosition(position, begin2, duration);

      var _first10 = _t10.value[0];
      $geom.props.style.translateX = _first10.translateX;
      $geom.props.style.translateY = _first10.translateY;

      if (_t10.value.length > 1) {
        _t10.value[0] = {
          offset: 0
        };

        for (var _i5 = 1; _i5 < _t10.value.length; _i5++) {
          var _item4 = _t10.value[_i5];
          _item4.translateX -= _first10.translateX;
          _item4.translateY -= _first10.translateY;
        }

        $geom.animate.push(_t10);
      }
    }

    if (fill && fill.rule === 2 || gFill && gFill.rule === 2) {
      $geom.props.style.fillRule = 'evenodd';
    } // geom内嵌的transform单独分析，都作用在中间层div上，anchorPoint比较特殊


    var anchorPoint = transform.anchorPoint;

    if (Array.isArray(anchorPoint) && anchorPoint.length) {
      var _t11 = transformOrigin(anchorPoint, begin2, duration);

      var _first11 = _t11.value[0];

      var v = _first11.transformOrigin.split(' ');

      v[0] = parseFloat(v[0]);
      v[1] = parseFloat(v[1]);
      /**
       * path很特殊，原始没有宽高，ae是锚点0,0相对于自身左上角原点，定位则是锚点来进行定位
       * 需记录最初的位置，发生锚点动画时，其会干扰left/top，同步形成位置动画
       */

      if (type === 'path') {
        var left = $geom.props.style.left;
        var top = $geom.props.style.top;
        $geom.props.style.left -= v[0];
        $geom.props.style.top -= v[1];
        var w = $geom.props.style.width;
        var h = $geom.props.style.height;
        v[0] += w * 0.5;
        v[1] += h * 0.5;

        if (v[0] !== w * 0.5 || v[1] !== h * 0.5) {
          $geom.props.style.transformOrigin = _first11.transformOrigin;
        }

        if (_t11.value.length > 1) {
          if (_first11.offset === 0) {
            _t11.value[0] = {
              offset: 0
            };
          } // tfo的每个动画需考虑对坐标的影响


          for (var _i6 = 1, _len4 = _t11.value.length; _i6 < _len4; _i6++) {
            var _item5 = _t11.value[_i6];

            var tfo = _item5.transformOrigin.split(' ');

            tfo[0] = parseFloat(tfo[0]);
            tfo[1] = parseFloat(tfo[1]);
            _item5.left = left - tfo[0];
            _item5.top = top - tfo[1];
          }

          $geom.animate.push(_t11);
        }
      } else {
        // tfo中心判断，加上尺寸*0.5
        v[0] += $geom.props.style.width * 0.5;
        v[1] += $geom.props.style.height * 0.5;

        if (v[0] !== $geom.props.style.width * 0.5 || v[1] !== $geom.props.style.height * 0.5) {
          $geom.props.style.transformOrigin = _first11.transformOrigin;
        }

        if (_t11.value.length > 1) {
          if (_first11.offset === 0) {
            _t11.value[0] = {
              offset: 0
            };
          }

          $geom.animate.push(_t11);
        }

        if (v[0]) {
          $geom.props.style.left = -v[0];
        }

        if (v[1]) {
          $geom.props.style.top = -v[1];
        }
      }
    }

    parseAnimate(child, data.shape, start, duration, offset, true, true); // gradient需要根据transformOrigin来计算

    if (gFill) {
      var _transformOrigin = $geom.props.style.transformOrigin;
      var _w = $geom.props.style.width,
          _h = $geom.props.style.height;
      var cx = void 0,
          cy = void 0;

      if (_transformOrigin) {
        _transformOrigin = _transformOrigin.split(' ');
        cx = parseFloat(_transformOrigin[0]);
        cy = parseFloat(_transformOrigin[1]);
      } else {
        cx = _w * 0.5;
        cy = _h * 0.5;
      }

      var _type = gFill.type,
          _start = gFill.start,
          end = gFill.end,
          _gFill$colors = gFill.colors,
          m = _gFill$colors.m,
          p = _gFill$colors.p;
      var steps = '';

      for (var _i7 = 0; _i7 < p; _i7++) {
        if (_i7) {
          steps += ', ';
        }

        steps += 'rgb(' + Math.floor(m[_i7 * 4 + 1] * 255);
        steps += ',' + Math.floor(m[_i7 * 4 + 2] * 255);
        steps += ',' + Math.floor(m[_i7 * 4 + 3] * 255);
        steps += ') ';
        steps += m[_i7 * 4] * 100 + '%';
      }

      if (!steps) {
        steps = '#F00, #00F';
      }

      if (_type === 1) {
        var x0 = $geom.props.style.translateX || 0,
            y0 = $geom.props.style.translateY || 0;
        var x1 = _start[0] + cx,
            y1 = _start[1] + cy;
        var x2 = end[0] + cx,
            y2 = end[1] + cy;
        f = "linearGradient(".concat((x1 - x0) / _w, " ").concat((y1 - y0) / _h, " ").concat((x2 - x0) / _w, " ").concat((y2 - y0) / _h, ", ").concat(steps, ")");
      } else if (_type === 2) {
        var _x = $geom.props.style.translateX || 0,
            _y = $geom.props.style.translateY || 0;

        var _x2 = _start[0] + cx,
            _y2 = _start[1] + cy;

        var _x3 = end[0] + cx,
            _y3 = end[1] + cy;

        f = "radialGradient(".concat((_x2 - _x) / _w, " ").concat((_y2 - _y) / _h, " ").concat((_x3 - _x) / _w, " ").concat((_y3 - _y) / _h, ", ").concat(steps, ")");
      }

      $geom.props.style.fill = [f];
    } // trimPath裁剪动画或属性


    if (trim && trim.hasOwnProperty('start') && trim.hasOwnProperty('end')) {
      var _start2 = trim.start,
          _end = trim.end;

      if (_start2.length > 1) {
        var _t12 = transformPath(_start2, begin2, duration, false);

        var _first12 = _t12.value[0];

        if (_first12.start !== 0) {
          $geom.props.start = _first12.start;
        }

        if (_t12.value.length > 1) {
          if (_first12.offset === 0) {
            _t12.value[0] = {
              offset: 0
            };
          }

          $geom.animate.push(_t12);
        }
      } else {
        $geom.props.start = _start2[0] * 0.01;
      }

      if (_end.length > 1) {
        var _t13 = transformPath(_end, begin2, duration, true);

        var _first13 = _t13.value[0];

        if (_first13.end !== 0) {
          $geom.props.end = _first13.end;
        }

        if (_t13.value.length > 1) {
          if (_first13.offset === 0) {
            _t13.value[0] = {
              offset: 0
            };
          }

          $geom.animate.push(_t13);
        }
      } else {
        $geom.props.end = _end[0] * 0.01;
      }
    }
  }

  if (fill && Array.isArray(fill.color) && fill.color.length) {
    var _t14 = transformFill(fill, begin2, duration);

    var _first14 = _t14.value[0];

    for (var _i8 = 0; _i8 < len; _i8++) {
      children[_i8].props.style.fill = _first14.fill;
    }

    if (_t14.value.length > 1) {
      _t14.value[0] = {
        offset: 0
      };

      for (var _i9 = 0; _i9 < len; _i9++) {
        children[_i9].animate.push(_t14);
      }
    }
  }

  if (stroke && Array.isArray(stroke.color) && stroke.color.length) {
    var _t15 = transformStroke(stroke, begin2, duration);

    var _first15 = _t15.value[0];

    for (var _i10 = 0; _i10 < len; _i10++) {
      children[_i10].props.style.stroke = _first15.stroke;
    }

    if (_t15.value.length > 1) {
      _t15.value[0] = {
        offset: 0
      };

      for (var _i11 = 0; _i11 < len; _i11++) {
        children[_i11].animate.push(_t15);
      }
    }
  }

  if (stroke && Array.isArray(stroke.width) && stroke.width.length) {
    var _t16 = transformStrokeWidth(stroke.width, begin2, duration);

    var _first16 = _t16.value[0];

    for (var _i12 = 0; _i12 < len; _i12++) {
      children[_i12].props.style.strokeWidth = _first16.strokeWidth;
    }

    if (_t16.value.length > 1) {
      _t16.value[0] = {
        offset: 0
      };

      for (var _i13 = 0; _i13 < len; _i13++) {
        children[_i13].animate.push(_t16);
      }
    }
  }

  if (stroke && Array.isArray(stroke.lineJoin) && stroke.lineJoin.length) {
    var _t17 = transformLineJoin(stroke.lineJoin, begin2, duration);

    var _first17 = _t17.value[0];

    for (var _i14 = 0; _i14 < len; _i14++) {
      children[_i14].props.style.strokeLineJoin = _first17.strokeLineJoin;
    }

    if (_t17.value.length > 1) {
      _t17.value[0] = {
        offset: 0
      };

      for (var _i15 = 0; _i15 < len; _i15++) {
        children[_i15].animate.push(_t17);
      }
    }
  }

  if (stroke && Array.isArray(stroke.strokeMiterlimit) && stroke.strokeMiterlimit.length) {
    var _t18 = transformMiterLimit(stroke.strokeMiterlimit, begin2, duration);

    var _first18 = _t18.value[0];

    for (var _i16 = 0; _i16 < len; _i16++) {
      children[_i16].props.style.strokeMiterlimit = _first18.strokeMiterlimit;
    }

    if (_t18.value.length > 1) {
      _t18.value[0] = {
        offset: 0
      };

      for (var _i17 = 0; _i17 < len; _i17++) {
        children[_i17].animate.push(_t18);
      }
    }
  }

  if (stroke && stroke.dashes) {
    for (var _i18 = 0; _i18 < len; _i18++) {
      children[_i18].props.style.strokeDasharray = [stroke.dashes];
    }
  }

  if (!stroke) {
    for (var _i19 = 0; _i19 < len; _i19++) {
      children[_i19].props.style.strokeWidth = [0];
    }
  }

  res.children = [child];
}

function parseMask(data, target, start, duration, displayStartTime, offset) {
  // $.ae2karas.log(data);
  // $.ae2karas.log(target);
  // 会出现父级链接特殊情况，此时遮罩应该是其唯一children
  if (target.children && target.children.length === 1) {
    target = target.children[0];
  }

  var targetProps = target.init;
  var left = targetProps.style.left || 0;
  var top = targetProps.style.top || 0;
  var res = {
    tagName: '$polyline',
    props: {
      style: {
        position: 'absolute',
        fill: '#FFF'
      }
    },
    animate: []
  };
  var width = data.width,
      height = data.height,
      _data$mask = data.mask,
      _data$mask$list = _data$mask.list,
      points = _data$mask$list.points,
      opacity = _data$mask$list.opacity,
      mode = _data$mask.mode,
      inverted = _data$mask.inverted; // 相加之外都是相减

  if (mode === MaskMode.ADD) {
    if (inverted) {
      res.props.clip = true;
    } else {
      res.props.mask = true;
    }
  } else {
    if (inverted) {
      res.props.mask = true;
    } else {
      res.props.clip = true;
    }
  } // 样式和target一致，只有位置信息需要


  var style = targetProps.style;

  for (var i in style) {
    if (style.hasOwnProperty(i) && ['left', 'top', 'translateX', 'translateY'].indexOf(i) > -1) {
      res.props.style[i] = style[i];
    }
  } // 要显示mask，可能会被target同化


  res.props.style.visibility = undefined;
  res.props.style.pointerEvents = undefined; // mask的2个动画，points和opacity

  var o = {};
  var begin2 = start - offset - displayStartTime;

  if (Array.isArray(points) && points.length) {
    var t = transformPoints(points, begin2, duration);
    o = t.data;
    res.props.style.width = o.width;
    res.props.style.height = o.height;
    t.data = undefined;
    var first = t.value[0];
    res.props.points = first.points;
    res.props.controls = first.controls;

    if (t.value.length > 1) {
      t.value[0] = {
        offset: 0
      };
      res.animate.push(t);
    }
  } else {
    return res;
  }

  if (Array.isArray(opacity) && opacity.length) {
    var _t19 = transformOpacity(opacity, begin2, duration);

    var _first19 = _t19.value[0];

    if (_first19.opacity !== 1) {
      res.props.style.opacity = _first19.opacity;
    }

    if (_t19.value.length > 1) {
      _t19.value[0] = {
        offset: 0
      };
      res.animate.push(_t19);
    }
  } // 获取对象锚点，mask的锚点需保持相同


  var transformOrigin = targetProps.style.transformOrigin;
  var cx = width * 0.5,
      cy = height * 0.5;

  if (transformOrigin) {
    var v = transformOrigin.split(' ');
    cx = parseFloat(v[0]);
    cy = parseFloat(v[1]);
  } // 位置和锚点保持和mask相同，由于points可能不是0，0开始，需计算偏移


  res.props.style.transformOrigin = cx - o.x2 + ' ' + (cy - o.y2);
  res.props.style.left = left + o.x2;
  res.props.style.top = top + o.y2;
  return res;
}

var uuid = 0;
function convert (data) {
  $.ae2karas.error('convert');
  var workAreaStart = data.workAreaStart,
      workAreaDuration = data.workAreaDuration,
      result = data.result,
      library = data.library;
  var name = result.name,
      width = result.width,
      height = result.height,
      children = result.children,
      displayStartTime = result.displayStartTime;
  var newLib = [];
  var res = {
    uuid: uuid++,
    name: name,
    tagName: 'div',
    props: {
      style: {
        position: 'absolute',
        width: width,
        height: height // overflow: 'hidden',

      }
    },
    children: [],
    library: newLib,
    abbr: false
  };
  parseChildren(res, children, library, newLib, workAreaStart, workAreaDuration, displayStartTime, 0);
  return res;
}

function json (ae2karas) {
  if (!ae2karas.JSON) {
    if (typeof _JSON !== 'undefined') {
      return ae2karas.JSON = _JSON;
    }

    var _JSON = ae2karas.JSON = {};

    (function () {
      var toString = {}.toString;

      function isType(type) {
        return function (obj) {
          return toString.call(obj) === '[object ' + type + ']';
        };
      }

      var isObject = isType('Object');
      var isString = isType('String');
      var isFunction = isType('Function');
      var isNumber = isType('Number');
      var isBoolean = isType('Boolean');

      function f(n) {
        return n < 10 ? '0' + n : n;
      }

      if (!isFunction(Date.prototype.toJSON)) {
        Date.prototype.toJSON = function () {
          return isFinite(this.valueOf()) ? this.getUTCFullYear() + '-' + f(this.getUTCMonth() + 1) + '-' + f(this.getUTCDate()) + 'T' + f(this.getUTCHours()) + ':' + f(this.getUTCMinutes()) + ':' + f(this.getUTCSeconds()) + 'Z' : null;
        };

        String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function () {
          return this.valueOf();
        };
      }

      var cx, escapable, gap, indent, meta, rep;

      function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
          var c = meta[a];
          return isString(c) ? c : "\\u" + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
      }

      function str(key, holder) {
        var i,
            k,
            v,
            length,
            mind = gap,
            partial,
            value = holder[key];

        if (value && isObject(value) && isFunction(value.toJSON)) {
          value = value.toJSON(key);
        }

        if (isFunction(rep)) {
          value = rep.call(holder, key, value);
        }

        if (isString(value)) {
          return quote(value);
        } else if (isNumber(value)) {
          return isFinite(value) ? String(value) : 'null';
        } else if (isBoolean(value) || value === null) {
          return String(value);
        } else {
          if (!value) {
            return 'null';
          }

          gap += indent;
          partial = [];

          if (Array.isArray(value)) {
            length = value.length;

            for (i = 0; i < length; i += 1) {
              partial[i] = str(i, value) || 'null';
            }

            v = partial.length === 0 ? '[]' : gap ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' : '[' + partial.join(',') + ']';
            gap = mind;
            return v;
          }

          if (rep && isObject(rep)) {
            length = rep.length;

            for (i = 0; i < length; i += 1) {
              if (isString(rep[i])) {
                k = rep[i];
                v = str(k, value);

                if (v) {
                  partial.push(quote(k) + (gap ? ': ' : ':') + v);
                }
              }
            }
          } else {
            for (k in value) {
              if (value.hasOwnProperty(k)) {
                v = str(k, value);

                if (v) {
                  partial.push(quote(k) + (gap ? ': ' : ':') + v);
                }
              }
            }
          }

          v = partial.length === 0 ? '{}' : gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' : '{' + partial.join(',') + '}';
          gap = mind;
          return v;
        }
      }

      if (!isFunction(_JSON.stringify)) {
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        meta = {
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"': '\\"',
          '\\': '\\\\'
        };

        _JSON.stringify = function (value, replacer, space) {
          var i;
          gap = '';
          indent = '';

          if (isNumber(space)) {
            for (i = 0; i < space; i += 1) {
              indent += ' ';
            }
          } else if (isString(space)) {
            indent = space;
          }

          rep = replacer;

          if (replacer && !isFunction(replacer) && (!isObject(replacer) || !isNumber(replacer.length))) {
            throw new Error('JSON.stringify');
          }

          return str('', {
            '': value
          });
        };
      }

      if (!isFunction(_JSON.parse)) {
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

        _JSON.parse = function (text, reviver) {
          var j;

          function walk(holder, key) {
            var k,
                v,
                value = holder[key];

            if (value && isObject(value)) {
              for (k in value) {
                if (value.hasOwnProperty(k)) {
                  v = walk(value, k);

                  if (v !== undefined) {
                    value[k] = v;
                  } else {
                    delete value[k];
                  }
                }
              }
            }

            return reviver.call(holder, key, value);
          }

          text = String(text);
          cx.lastIndex = 0;

          if (cx.test(text)) {
            text = text.replace(cx, function (a) {
              return "\\u" + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
          }

          if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
            var eval2 = eval;
            j = eval2('(' + text + ')');
            return isFunction(reviver) ? walk({
              '': j
            }, '') : j;
          }

          throw new SyntaxError('JSON.parse');
        };
      }
    })();

    return _JSON;
  }

  return ae2karas.JSON;
}

var ES_TYPE = enums.ES_TYPE,
    EVENT = enums.EVENT;

Array.isArray = Array.isArray || function (arr) {
  return arr instanceof Array;
};

Array.prototype.indexOf = Array.prototype.indexOf || function (o) {
  for (var i = 0, len = this.length; i < len; i++) {
    if (this[i] === o) {
      return i;
    }
  }

  return -1;
};

var ae2karas = $.ae2karas = $.ae2karas || {};
json(ae2karas);

ae2karas.dispatch = function () {
  var xLib;

  try {
    xLib = new ExternalObject('lib:PlugPlugExternalObject');
  } catch (e) {
    alert('Missing ExternalObject: ');
  }

  return function (type, data) {
    if (xLib) {
      if (data && data instanceof Object) {
        data = ae2karas.JSON.stringify(data);
      } else if (data === undefined) {
        data = 'undefined';
      } else if (data === null) {
        data = 'null';
      } else if (data === true) {
        data = 'true';
      } else if (data === false) {
        data = 'false';
      }

      var eventObj = new CSXSEvent();
      eventObj.type = type;
      eventObj.data = data;
      eventObj.dispatch();
    }
  };
}();

ae2karas.log = function (s) {
  $.ae2karas.dispatch(enums.EVENT.LOG, s);
};

ae2karas.warn = function (s) {
  $.ae2karas.dispatch(enums.EVENT.WARN, s);
};

ae2karas.error = function (s) {
  $.ae2karas.dispatch(enums.EVENT.ERROR, s);
};

function getItemType(item) {
  if (item instanceof CompItem) {
    return ES_TYPE.COMP_ITEM;
  }

  if (item instanceof FolderItem) {
    return ES_TYPE.FOLDER_ITEM;
  }

  if (item instanceof FootageItem) {
    return ES_TYPE.FOOTAGE_ITEM;
  }

  return ES_TYPE.UNKNOWN;
}

ae2karas.getCompositions = function () {
  var folderItem = app.project;
  var list = []; // 所有的合成都在app.project下，包含文件夹递归树的

  for (var i = 1; i <= folderItem.numItems; i++) {
    var compItem = folderItem.item(i);
    var type = getItemType(compItem);

    if (type === ES_TYPE.COMP_ITEM) {
      list.push({
        id: compItem.id,
        name: compItem.name,
        width: compItem.width,
        height: compItem.height,
        type: type
      });
    }
  }

  $.ae2karas.dispatch(EVENT.INIT, list);
};

function findCompositionById(id) {
  for (var i = 1; i <= app.project.numItems; i++) {
    var compItem = app.project.item(i);

    if (compItem.id === id) {
      return compItem;
    }
  }

  return null;
}

ae2karas.convert = function (id) {
  $.ae2karas.error('start');
  var composition = findCompositionById(id);

  if (!composition) {
    $.ae2karas.error('error: no composition');
    $.ae2karas.dispatch(enums.EVENT.CANCEL);
    return;
  } // 递归遍历分析合成对象，转换ae的图层为普通js对象，留给后续转换karas用


  var res = parse$1(composition);
  $.ae2karas.dispatch(enums.EVENT.FINISH, convert(res)); // 结束后才能删除临时生成的导出psd的合成和渲染队列

  $.ae2karas.delTemp();
  $.ae2karas.error('finish');
};

var list = [];

ae2karas.addTemp = function (o) {
  list.push(o);
};

ae2karas.delTemp = function () {
  while (list.length) {
    list.pop().remove();
  }
};

ae2karas["export"] = function (data) {
  $.ae2karas.error('export');
  $.ae2karas.log(data);
  var file = File.saveDialog();

  if (!file) {
    return;
  }

  var name = file.fsName;

  if (!/\.json$/.test(name)) {
    name += '.json';
  }

  var f = new File(name);
  f.open('w');
  f.encoding = 'utf-8';
  f.write(data);
  f.close();
  return true;
};
//# sourceMappingURL=index.jsx.map
