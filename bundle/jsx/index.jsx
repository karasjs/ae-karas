'use strict';

var enums = {
  ES_TYPE: {
    FOLDER_ITEM: 'FolderItem',
    FOOTAGE_ITEM: 'FootageItem',
    COMP_ITEM: 'CompItem'
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
  'ADBE Vector Rotation': 'rotation',
  'ADBE Vector Group Opacity': 'opacity',
  'ADBE Vector Trim Start': 'start',
  'ADBE Vector Trim End': 'end'
};

function getPropertyValues(prop) {
  var numKeys = prop.numKeys; // 根据关键帧数量，2+帧是普通变化，1帧等同于0帧value

  if (numKeys && numKeys > 1) {
    var arr = [];

    for (var i = 1; i <= numKeys; i++) {
      arr.push({
        time: prop.keyTime(i) * 1000,
        value: prop.keyValue(i),
        easing: i === numKeys ? undefined : getEasing(prop, i, i + 1)
      });
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
      e2 = prop.keyInTemporalEase(end)[0];
  var x1 = e1.influence * 0.01,
      x2 = 1 - e2.influence * 0.01;
  var y1, y2;
  var matchName = prop.matchName;

  if (['ADBE Anchor Point', 'ADBE Position', 'ADBE Vector Anchor', 'ADBE Vector Position', 'ADBE Vector Scale', 'ADBE Vector Skew'].indexOf(matchName) > -1) {
    var avSpeedX = Math.abs(v2[0] - v1[0]) / (t2 - t1);
    var avSpeedY = Math.abs(v2[1] - v1[1]) / (t2 - t1);
    var avSpeed = Math.sqrt(avSpeedX * avSpeedX + avSpeedY * avSpeedY);
    y1 = x1 * e1.speed / avSpeed;
    y2 = 1 - (1 - x2) * e2.speed / avSpeed;
  } else {
    var _avSpeedX = Math.abs(v2 - v1) / (t2 - t1);

    var _avSpeedY = Math.abs(v2 - v1) / (t2 - t1);

    var _avSpeed = Math.sqrt(_avSpeedX * _avSpeedX + _avSpeedY * _avSpeedY);

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
        res[LAYER_TRANSFORM[matchName]] = getPropertyValues(item);
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
        res[VECTOR_TRANSFORM[matchName]] = getPropertyValues(item);
      }
    }
  }

  return res;
}

function group(prop) {
  var res = {}; // 这里是矩形1层，主要关注Groups属性即可，blendMode暂时无视，transform被上钻2层提前

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
        case 'ADBE Vectors Group':
          res.content = content(item);
          break;

        case 'ADBE Vector Transform Group':
          // 奇怪的地方，显示应该下钻2层到如rect同级，可实际提前了
          res.transform = transformVector(item);
          break;
      }
    }
  }

  res.content.transform = res.transform;
  return res.content;
}

function content(prop) {
  // 矩形1下面会多出一层内容层看不见，就是本层，其下面则是可视的子属性层
  var res = {
    name: prop.name
  };

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
        case 'ADBE Vector Shape - Rect':
          res.content = rect(item);
          break;

        case 'ADBE Vector Shape - Ellipse':
          res.content = ellipse(item);
          break;

        case 'ADBE Vector Shape - Star':
          res.content = star(item);
          break;

        case 'ADBE Vector Shape - Group':
          res.content = path$1(item);
          break;

        case 'ADBE Vector Graphic - Stroke':
          res.stroke = stroke(item);
          break;

        case 'ADBE Vector Graphic - Fill':
          res.fill = fill(item);
          break;

        case 'ADBE Vector Graphic - G-Fill':
          res.gfill = gFill(item);
          break;
      }
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
          res.size = item.value;
          break;

        case 'ADBE Vector Ellipse Position':
          res.position = item.value;
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
          res.points = item.value;
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

function gFill(prop) {
  var res = {};

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

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
          //
          break;

        case 'ADBE Vector Fill Opacity':
          res.opacity = item.value;
          break;
      }
    }
  }

  return res;
}

function vector (prop, library) {
  var res = {}; // 这里是内容层，一般只有1个属性，如矩形1

  for (var i = 1; i <= prop.numProperties; i++) {
    var item = prop.property(i);

    if (item && item.enabled) {
      var matchName = item.matchName;

      switch (matchName) {
        case 'ADBE Vector Group':
          res.shape = group(item);
          break;

        case 'ADBE Vector Filter - Trim':
          res.trim = transformVector(item);
          break;
      }
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

var uuid = 0;

function recursion$1(composition, library) {
  var name = composition.name,
      layers = composition.layers,
      width = composition.width,
      height = composition.height,
      duration = composition.duration;
  $.ae2karas.error('composition: ' + name); // 先统计哪些层被作为父级链接

  var asParent = {},
      asChild = {};

  for (var i = 1; i <= layers.length; i++) {
    var item = layers[i];

    if (item.parent && item.parent.index) {
      asParent[item.parent.index] = true;
      asChild[item.index] = item.parent.index;
    }
  } // 是否是独奏模式


  var hasSolo;

  for (var _i = 1; _i <= layers.length; _i++) {
    var _item = layers[_i];

    if (_item.solo) {
      hasSolo = true;
      break;
    }
  }

  var children = []; // 遍历分析图层，独奏时只看独奏图层，否则看可见图层

  for (var _i2 = 1; _i2 <= layers.length; _i2++) {
    var _item2 = layers[_i2];
    var index = _item2.index; // 根据是否独奏或可见决定是否分析或跳过，被作为父级链接的即便不可见也要统计

    if (!asParent.hasOwnProperty(index)) {
      if (hasSolo) {
        if (!_item2.solo) {
          continue;
        }
      } else {
        if (!_item2.enabled) {
          continue;
        }
      }
    }

    var o = parseLayer(_item2, library);

    if (o) {
      // 父级打标uuid的同时，之前记录的hash也记录下来
      if (asParent.hasOwnProperty(index)) {
        asParent[index] = o.asParent = uuid++;
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
    duration: duration * 1000,
    // 合成的总时长
    children: children
  };
}

function parseLayer(layer, library) {
  var res = {
    name: layer.name,
    index: layer.index,
    width: layer.width,
    height: layer.height,
    enabled: layer.solo || layer.enabled,
    // 可能是个隐藏的父级链接图层就false不可见
    startTime: layer.startTime * 1000,
    // 开始时间，即时间轴上本图层初始位置
    inPoint: layer.inPoint * 1000,
    // 真正开始显示时间，>= startTime，可能有前置空白不显示的一段
    outPoint: layer.outPoint * 1000,
    // 真正结束显示时间，<= duration绝对值，可能有后置空白不显示的一段
    blendingMode: layer.blendingMode
  };
  $.ae2karas.warn('layer: ' + res.name);
  var geom, txt;

  for (var i = 1; i <= layer.numProperties; i++) {
    var prop = layer.property(i);

    if (prop && prop.enabled) {
      var matchName = prop.matchName;

      switch (matchName) {
        case 'ADBE Transform Group':
          res.transform = transformLayer(prop);
          break;

        case 'ADBE Root Vectors Group':
          // 形状图层中的内容子属性
          geom = vector(prop);
          break;

        case 'ADBE Mask Parade':
          res.mask = mask(prop);
          break;

        case 'ADBE Text Properties':
          txt = text(prop);
          break;
      }
    }
  }

  var source = layer.source;

  if (geom && geom.shape && geom.shape.content && geom.shape.content.type) {
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

        res.points = item.property('maskShape').value;
        res.opacity = item.property('Mask Opacity').value;
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
            text: value.text
          };
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
  var library = [];
  var result = recursion$1(composition, library);
  $.ae2karas.log(result);
  $.ae2karas.log(library);
  return {
    workAreaStart: workAreaStart,
    workAreaDuration: workAreaDuration,
    result: result,
    library: library
  };
}

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
    };
    list.unshift(o);
  } // 截取首帧部分
  else if (first.time < begin) {
    var next = list[1];
    var percent = (begin - first.time) / (next.time - first.time);
    first.time = begin;
    first.value = reducer(first.value, next.value, percent);

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
  // let [[x1, y1], [x2, y2], [x3, y3], p4] = points;
  var p1 = points[0],
      p2 = points[1],
      p3 = points[2],
      p4 = points[3];
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

  if (points.length === 4) {
    var x4 = p4[0],
        y4 = p4[1];
    var x34 = (x4 - x3) * t + x3;
    var y34 = (y4 - y3) * t + y3;
    var x234 = (x34 - x23) * t + x23;
    var y234 = (y34 - y23) * t + y23;
    var x1234 = (x234 - x123) * t + x123;
    var y1234 = (y234 - y123) * t + y123;
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
      fill: 'forwards'
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
      fill: 'forwards'
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
      fill: 'forwards'
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      translateX: list[0][0],
      translateY: list[0][1]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return [prev[0] + (next[0] - prev[0]) * percent, prev[1] + (next[1] - prev[1]) * percent, prev[2] + (next[2] - prev[2]) * percent];
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        translateX: item.value[0],
        translateY: item.value[1],
        easing: item.easing
      });
    }
  }

  return res;
}
function transformRotateX(list, begin, duration) {
  var res = {
    value: [],
    options: {
      duration: duration,
      fill: 'forwards'
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      rotateX: list[0]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return prev + (next - prev) * percent;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        rotateX: item.value,
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
      fill: 'forwards'
    }
  }; // 只有1帧没有动画，无需计算补间

  if (list.length === 1) {
    res.value.push({
      rotateY: list[0]
    });
  } else {
    list = getAreaList(list, begin, duration, function (prev, next, percent) {
      return prev + (next - prev) * percent;
    });

    for (var i = 0, len = list.length; i < len; i++) {
      var item = list[i];
      res.value.push({
        offset: (item.time - begin) / duration,
        rotateY: item.value,
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
      fill: 'forwards'
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
      fill: 'forwards'
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
      fill: 'forwards'
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

var path = {
  parse: function parse(vertices, inTangents, outTangents, closed) {
    var x1 = vertices[0][0],
        y1 = vertices[0][1];
    var x2 = x1,
        y2 = y1; // 控制点是相对于顶点的坐标

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
    }

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

    var w = x1 - x2,
        h = y1 - y2;
    var pts = [],
        cts = [];

    for (var _i = 0, _len = vertices.length; _i < _len; _i++) {
      var _item = vertices[_i];
      pts.push([(_item[0] - x2) / w, (_item[1] - y2) / h]);
      var _it2 = inTangents[_i],
          _ot2 = outTangents[_i]; // 上一个顶点到本顶点

      if (_it2[0] || _it2[1]) {
        var j = _i - 1;

        if (j === -1) {
          j = _len - 1;
        }

        cts[j] = cts[j] || [];
        cts[j].push(pts[_i][0] + _it2[0] / w);
        cts[j].push(pts[_i][1] + _it2[1] / h);
      } // 本顶点到下一个顶点


      if (_ot2[0] || _ot2[1]) {
        cts[_i] = cts[_i] || [];

        cts[_i].push(pts[_i][0] + _ot2[0] / h);

        cts[_i].push(pts[_i][1] + _ot2[1] / h);
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
 * 预解析父级链接，不递归深入children，返回一个普通的div
 * @param data
 * @param library
 * @param start
 * @param duration
 * @param offset
 */

function preParse(data, library, start, duration, offset) {
  var name = data.name,
      width = data.width,
      height = data.height,
      inPoint = data.inPoint,
      outPoint = data.outPoint;
  var begin = start + offset; // 图层在工作区外特殊处理，取最近的一帧内容 TODO

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
        height: height
      }
    },
    children: [],
    animate: []
  };
  parseAnimate(res, data, start, duration, offset, true, false);
  return res;
}

function parseAnimate(res, data, start, duration, offset, isDirect, isGeom) {
  var width = data.width,
      height = data.height,
      transform = data.transform; // 分别分析每个变换，过程很相似，当为单帧时需合并到init.style，多帧第一帧需合并且置空

  var anchorPoint = transform.anchorPoint,
      opacity = transform.opacity,
      position = transform.position,
      rotateX = transform.rotateX,
      rotateY = transform.rotateY,
      rotateZ = transform.rotateZ,
      scale = transform.scale;
  var begin2 = start - offset;
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
      if (first.offset === 0) {
        t.value[0] = {
          offset: 0
        };
      } // tfo的每个动画需考虑对坐标的影响


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
      if (_first.offset === 0) {
        _t.value[0] = {
          offset: 0
        };
      }

      res.animate.push(_t);
    }
  }

  if (Array.isArray(position) && position.length) {
    var _t2 = transformPosition(position, begin2, duration);

    var _first2 = _t2.value[0];

    if (_first2.translateX) {
      init.style.translateX = _first2.translateX;
    }

    if (_first2.translateY) {
      init.style.translateY = _first2.translateY;
    }

    if (_t2.value.length > 1) {
      if (_first2.offset === 0) {
        _t2.value[0] = {
          offset: 0
        };
      }

      res.animate.push(_t2);
    }
  }

  if (Array.isArray(rotateX) && rotateX.length) {
    var _t3 = transformRotateX(rotateX, begin2, duration);

    var _first3 = _t3.value[0];

    if (_first3.rotateX) {
      init.style.rotateX = _first3.rotateX;
    }

    if (_t3.value.length > 1) {
      if (_first3.offset === 0) {
        _t3.value[0] = {
          offset: 0
        };
      }

      res.animate.push(_t3);
    }
  }

  if (Array.isArray(rotateY) && rotateY.length) {
    var _t4 = transformRotateY(rotateY, begin2, duration);

    var _first4 = _t4.value[0];

    if (_first4.rotateY) {
      init.style.rotateY = _first4.rotateY;
    }

    if (_t4.value.length > 1) {
      if (_first4.offset === 0) {
        _t4.value[0] = {
          offset: 0
        };
      }

      res.animate.push(_t4);
    }
  }

  if (Array.isArray(rotateZ) && rotateZ.length) {
    var _t5 = transformRotateZ(rotateZ, begin2, duration);

    var _first5 = _t5.value[0];

    if (_first5.rotateZ) {
      init.style.rotateZ = _first5.rotateZ;
    }

    if (_t5.value.length > 1) {
      if (_first5.offset === 0) {
        _t5.value[0] = {
          offset: 0
        };
      }

      res.animate.push(_t5);
    }
  }

  if (Array.isArray(scale) && scale.length) {
    var _t6 = transformScale(scale, begin2, duration);

    var _first6 = _t6.value[0];

    if (_first6.scaleX !== 1) {
      init.style.scaleX = _first6.scaleX;
    }

    if (_first6.scaleY !== 1) {
      init.style.scaleY = _first6.scaleY;
    }

    if (_first6.scaleZ !== 1) {
      init.style.scaleZ = _first6.scaleZ;
    }

    if (_t6.value.length > 1) {
      if (_first6.offset === 0) {
        _t6.value[0] = {
          offset: 0
        };
      }

      res.animate.push(_t6);
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
 * @param offset
 * @param parentLink
 */


function recursion(data, library, newLib, start, duration, offset, parentLink) {
  // 作为父级链接不可见时无需导出
  if (!data.enabled) {
    return null;
  }

  var name = data.name,
      assetId = data.assetId,
      startTime = data.startTime,
      inPoint = data.inPoint,
      outPoint = data.outPoint,
      blendingMode = data.blendingMode;

  if (assetId === undefined || assetId === null) {
    return null;
  }

  var begin = start + offset; // 图层在工作区外可忽略

  if (inPoint >= begin + duration || outPoint <= begin) {
    return null;
  }

  var res = {
    name: name
  };
  res.libraryId = parse(library, assetId, newLib, start, duration, offset + startTime);
  res.init = {
    style: {}
  }; // 混合模式

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
        fill: 'forwards'
      }
    }; // 开头不可见，默认init的style

    if (inPoint > begin) {
      res.init.style.visibility = 'hidden';
      res.init.style.pointerEvents = 'none';
      v.value.push({
        offset: 0
      });
      v.value.push({
        offset: (inPoint - begin) / duration,
        visibility: 'inherit',
        pointerEvents: 'auto'
      });
    } // 结尾计算


    if (outPoint < begin + duration) {
      // 可能是第一帧但offset不为0，不用担心karas会补充空首帧
      v.value.push({
        offset: (outPoint - begin) / duration,
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
    }

    res.animate.push(v);
  }

  parseAnimate(res, data, start, duration, offset, false, false);

  if (data.hasOwnProperty('asChild')) {
    var asChild = data.asChild;

    if (parentLink.hasOwnProperty(asChild)) {
      var div = JSON.stringify(parentLink[asChild]);
      div = JSON.parse(div);
      div.children.push(res);
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
 * @param offset
 */


function parse(library, assetId, newLib, start, duration, offset) {
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
        height: height
      }
    }
  }; // 矢量图层特殊解析，添加

  if (geom) {
    parseGeom(res, data, start, duration, offset);
  } else if (text) {
    var content = data.content;
    res.props.style.color = [parseInt(content.fillColor[0] * 255), parseInt(content.fillColor[1] * 255), parseInt(content.fillColor[2] * 255)];
    res.props.style.fontFamily = content.fontFamily;
    res.props.style.fontSize = content.fontSize;
    res.props.style.fontStyle = content.fontStyle;
    res.props.style.lineHeight = content.leading / content.fontSize;
    res.children = [content.text];
  } // 图片无children
  else if (type === 'img') {
    res.props.src = src;
  } else if (Array.isArray(children)) {
    res.children = [];
    parseChildren(res, children, library, newLib, start, duration, offset);
  }

  res.id = newLib.length;
  newLib.push(res);
  return res.id;
}

function parseChildren(res, children, library, newLib, start, duration, offset) {
  if (Array.isArray(children)) {
    // 先一遍解析父级链接，因为父级可能不展示或者只需要父级一层不递归解析父级的children
    var parentLink = {};

    for (var i = 0, len = children.length; i < len; i++) {
      var item = children[i];

      if (item.hasOwnProperty('asParent')) {
        parentLink[item.asParent] = preParse(item, library, start, duration, offset);
      }
    } // 再普通解析，遇到父级链接特殊处理


    for (var _i = 0, _len = children.length; _i < _len; _i++) {
      var _item = children[_i];
      var temp = recursion(_item, library, newLib, start, duration, offset, parentLink);

      if (temp) {
        res.children.push(temp);

        if (_item.mask && _item.mask.enabled) {
          res.children.push(parseMask(_item, temp));
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
 * @param offset
 */


function parseGeom(res, data, start, duration, offset) {
  var _data$shape = data.shape,
      content = _data$shape.content,
      fill = _data$shape.fill,
      stroke = _data$shape.stroke,
      transform = _data$shape.transform,
      trim = data.trim;
  var type = content.type;
      content.direction;
      var size = content.size,
      position = content.position,
      roundness = content.roundness,
      points = content.points;
  var f;

  if (fill) {
    f = [parseInt(fill.color[0] * 255), parseInt(fill.color[1] * 255), parseInt(fill.color[2] * 255), fill.color[3]];

    if (fill.opacity !== 100) {
      f[3] *= fill.opacity * 0.01;
    }
  }

  var s;

  if (stroke) {
    s = [parseInt(stroke.color[0] * 255), parseInt(stroke.color[1] * 255), parseInt(stroke.color[2] * 255), stroke.color[3]];

    if (stroke.opacity !== 100) {
      s[3] *= stroke.opacity * 0.01;
    }
  }

  var child = {
    tagName: '$polyline',
    props: {
      style: {
        position: 'absolute',
        fill: [f],
        strokeWidth: [stroke.width],
        stroke: [s],
        strokeLinejoin: [stroke.lineJoin],
        strokeMiterlimit: [stroke.miterLimit]
      }
    },
    animate: []
  };

  if (stroke.dashes) {
    child.props.style.strokeDasharray = [stroke.dashes];
  }

  if (type === 'rect') {
    child.props.style.width = size[0];
    child.props.style.height = size[1];
    var o = path.rect2polyline(size[0], size[1], roundness);
    child.props.points = o.points;
    child.props.controls = o.controls;
  } else if (type === 'ellipse') {
    child.props.style.width = size[0];
    child.props.style.height = size[1];

    var _o = path.ellipse2polyline();

    child.props.points = _o.points;
    child.props.controls = _o.controls;
  } else if (type === 'star') ; else if (type === 'path') {
    var vertices = points.vertices,
        inTangents = points.inTangents,
        outTangents = points.outTangents,
        closed = points.closed;

    var _o2 = path.parse(vertices, inTangents, outTangents, closed);

    child.props.style.width = _o2.width;
    child.props.style.height = _o2.height;
    child.props.points = _o2.points;
    child.props.controls = _o2.controls; // path的特殊位置计算

    child.props.style.left = _o2.x2;
    child.props.style.top = _o2.y2;
  } // path没有position


  if (position && position[0]) {
    child.props.style.left = -position[0];
  }

  if (position && position[1]) {
    child.props.style.top = -position[1];
  }

  if (fill && fill.rule === 2) {
    child.props.style.fillRule = 'evenodd';
  } // geom内嵌的transform单独分析，anchorPoint比较特殊


  var anchorPoint = transform.anchorPoint;
  var begin2 = start - offset;

  if (Array.isArray(anchorPoint) && anchorPoint.length) {
    var t = transformOrigin(anchorPoint, begin2, duration);
    var first = t.value[0];
    var v = first.transformOrigin.split(' ');
    v[0] = parseFloat(v[0]);
    v[1] = parseFloat(v[1]);
    /**
     * path很特殊，原始没有宽高，ae是锚点0,0相对于自身左上角原点，定位则是锚点来进行定位
     * 需记录最初的位置，发生锚点动画时，其会干扰left/top，同步形成位置动画
     */

    if (type === 'path') {
      var left = child.props.style.left;
      var top = child.props.style.top;
      child.props.style.left -= v[0];
      child.props.style.top -= v[1];
      var w = child.props.style.width;
      var h = child.props.style.height;
      v[0] += w * 0.5;
      v[1] += h * 0.5;

      if (v[0] !== w * 0.5 || v[1] !== h * 0.5) {
        child.props.style.transformOrigin = first.transformOrigin;
      }

      if (t.value.length > 1) {
        if (first.offset === 0) {
          t.value[0] = {
            offset: 0
          };
        } // tfo的每个动画需考虑对坐标的影响


        for (var i = 1, len = t.value.length; i < len; i++) {
          var item = t.value[i];
          var tfo = item.transformOrigin.split(' ');
          tfo[0] = parseFloat(tfo[0]);
          tfo[1] = parseFloat(tfo[1]);
          item.left = left - tfo[0];
          item.top = top - tfo[1];
        }

        child.animate.push(t);
      }
    } else {
      // tfo中心判断，加上尺寸*0.5
      v[0] += size[0] * 0.5;
      v[1] += size[1] * 0.5;

      if (v[0] !== size[0] * 0.5 || v[1] !== size[1] * 0.5) {
        child.props.style.transformOrigin = first.transformOrigin;
      }

      if (t.value.length > 1) {
        if (first.offset === 0) {
          t.value[0] = {
            offset: 0
          };
        }

        child.animate.push(t);
      }

      if (v[0]) {
        child.props.style.left = -v[0];
      }

      if (v[1]) {
        child.props.style.top = -v[1];
      }
    }
  }

  parseAnimate(child, data.shape, start, duration, offset, true, true); // trimPath裁剪动画或属性

  if (trim && trim.hasOwnProperty('start') && trim.hasOwnProperty('end')) {
    var _start = trim.start,
        end = trim.end;

    if (_start.length > 1) {
      var _t7 = transformPath(_start, begin2, duration, false);

      var _first7 = _t7.value[0];

      if (_first7.start !== 0) {
        child.props.start = _first7.start;
      }

      if (_t7.value.length > 1) {
        if (_first7.offset === 0) {
          _t7.value[0] = {
            offset: 0
          };
        }

        child.animate.push(_t7);
      }
    } else {
      child.props.start = _start[0] * 0.01;
    }

    if (end.length > 1) {
      var _t8 = transformPath(end, begin2, duration, true);

      var _first8 = _t8.value[0];

      if (_first8.end !== 0) {
        child.props.end = _first8.end;
      }

      if (_t8.value.length > 1) {
        if (_first8.offset === 0) {
          _t8.value[0] = {
            offset: 0
          };
        }

        child.animate.push(_t8);
      }
    } else {
      child.props.end = end[0] * 0.01;
    }
  }

  res.children = [child];
}

function parseMask(data, target) {
  var left = target.init.style.left || 0;
  var top = target.init.style.top || 0;
  var res = {
    tagName: '$polyline',
    props: {
      style: {
        position: 'absolute',
        fill: '#FFF'
      }
    }
  };
  var width = data.width,
      height = data.height,
      _data$mask = data.mask,
      points = _data$mask.points,
      opacity = _data$mask.opacity,
      mode = _data$mask.mode,
      inverted = _data$mask.inverted;

  if (opacity < 100) {
    res.props.style.opacity = opacity * 0.01;
  } // 相加之外都是相减


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
  } // 获取对象锚点，mask的锚点需保持相同


  var transformOrigin = target.init.style.transformOrigin;
  var cx = width * 0.5,
      cy = height * 0.5;

  if (transformOrigin) {
    var v = transformOrigin.split(' ');
    cx = parseFloat(v[0]);
    cy = parseFloat(v[1]);
  }

  var vertices = points.vertices,
      inTangents = points.inTangents,
      outTangents = points.outTangents,
      closed = points.closed;
  var o = path.parse(vertices, inTangents, outTangents, closed);
  res.props.style.width = o.width;
  res.props.style.height = o.height;
  res.props.points = o.points;
  res.props.controls = o.controls; // 样式和target一致

  var style = target.init.style;

  for (var i in style) {
    if (style.hasOwnProperty(i)) {
      res.props.style[i] = style[i];
    }
  } // 位置和锚点保持和mask相同，由于points可能不是0，0开始，需计算偏移


  res.props.style.transformOrigin = cx - o.x2 + ' ' + (cy - o.y2);
  res.props.style.left = left + o.x2;
  res.props.style.top = top + o.y2;
  return res;
}

function convert (data) {
  $.ae2karas.error('convert');
  var workAreaStart = data.workAreaStart,
      workAreaDuration = data.workAreaDuration,
      result = data.result,
      library = data.library;
  var name = result.name,
      width = result.width,
      height = result.height,
      children = result.children;
  var newLib = [];
  var res = {
    name: name,
    tagName: 'div',
    props: {
      style: {
        position: 'absolute',
        width: width,
        height: height
      }
    },
    children: [],
    library: newLib,
    abbr: false
  };
  parseChildren(res, children, library, newLib, workAreaStart, workAreaDuration, 0);
  return res;
}

var ES_TYPE = enums.ES_TYPE,
    EVENT = enums.EVENT;
var ae2karas = $.ae2karas = $.ae2karas || {};

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
        data = JSON.stringify(data);
      } else if (data === undefined) {
        data = 'undefined';
      } else if (data === null) {
        data = 'null';
      } else if (data === true) {
        data = 'true';
      } else if (data === false) {
        data = 'false';
      } // if(typeof data === 'number') {
      //   data = data.toString();
      // }


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
  var getType = {};
  var type = getType.toString.call(item);

  switch (type) {
    case '[object FolderItem]':
      return ES_TYPE.FOLDER_ITEM;

    case '[object FootageItem]':
      return ES_TYPE.FOOTAGE_ITEM;

    case '[object CompItem]':
      return ES_TYPE.COMP_ITEM;
  }

  return type;
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
  $.ae2karas.log(id);
  var composition = findCompositionById(id);

  if (!composition) {
    $.ae2karas.error('error: no composition');
    $.ae2karas.dispatch(enums.EVENT.CANCEL);
    return;
  } // 递归遍历分析合成对象，转换ae的图层为普通js对象，留给后续转换karas用


  var res = parse$1(composition);
  $.ae2karas.dispatch(enums.EVENT.FINISH, convert(res)); // 结束后才能删除临时生成的导出psd的合成和渲染队列

  $.ae2karas.delTemp();
  $.ae2karas.error('end');
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
//# sourceMappingURL=index.jsx.map
