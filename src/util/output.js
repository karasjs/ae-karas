const STYLE = [
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'transformOrigin',
  'translateX',
  'translateY',
  'translateZ',
  'opacity',
  'rotateX',
  'rotateY',
  'rotateZ',
  'scaleX',
  'scaleY',
  'scaleZ',
  'start',
  'end',
  'begin',
  'perspective',
  'fontSize',
  'lineHeight',
  'translatePath',
];

function recursion(data, params) {
  // 分为普通节点和library节点分别递归进行
  if(data.hasOwnProperty('libraryId')) {
    if(data.init) {
      if(data.init.points) {
        parsePoint(data.init.points, params);
      }
      if(data.init.controls) {
        parsePoint(data.init.controls, params);
      }
      if(data.init.style) {
        parseStyle(data.init.style, params);
      }
    }
  }
  else {
    if(data.props) {
      if(data.props.points) {
        parsePoint(data.props.points, params);
      }
      if(data.props.controls) {
        parsePoint(data.props.controls, params);
      }
      if(data.props.style) {
        parseStyle(data.props.style, params);
      }
      if(data.tagName === 'img' && data.props.url && !/^data:/.test(data.props.url)) {
        params[data.props.url] = {
          url: data.props.url,
        };
      }
    }
    let children = data.children;
    if(Array.isArray(children)) {
      for(let i = 0, len = children.length; i < len; i++) {
        recursion(children[i], params);
      }
    }
  }
  let animate = data.animate;
  if(Array.isArray(animate)) {
    for(let i = 0, len = animate.length; i < len; i++) {
      parseAnimate(animate[i], params);
    }
  }
  else if(animate) {
    parseAnimate(animate, params);
  }
}

function parsePoint(data, params) {
  for(let i = 0, len = data.length; i < len; i++) {
    let item = data[i];
    if(Array.isArray(item)) {
      for(let i = 0, len = item.length; i < len; i++) {
        let v = item[i];
        if(v) {
          v = v.toFixed(params.precision + 2);
          item[i] = parseFloat(v);
        }
      }
    }
  }
}

function parseStyle(data, params) {
  let { unit, rem = 0, vw = 0, vh = 0 } = params;
  for(let i = 0, len = STYLE.length; i < len; i++) {
    let k = STYLE[i];
    if(data.hasOwnProperty(k)) {
      let v = data[k];
      if(k === 'transformOrigin') {
        v = v.split(' ');
        v[0] = parseFloat(v[0]);
        v[1] = parseFloat(v[1]);
        if(unit === 'rem') {
          v[0] /= rem;
          v[0] = parseFloat(v[0].toFixed(params.precision));
          v[0] += 'rem';
          v[1] /= rem;
          v[1] = parseFloat(v[1].toFixed(params.precision));
          v[1] += 'rem';
        }
        else if(unit === 'vw') {
          v[0] *= 100 / vw;
          v[0] = parseFloat(v[0].toFixed(params.precision));
          v[0] += 'vw';
          v[1] *= 100 / vw;
          v[1] = parseFloat(v[1].toFixed(params.precision));
          v[1] += 'vw';
        }
        else if(unit === 'vh') {
          v[0] *= 100 / vh;
          v[0] = parseFloat(v[0].toFixed(params.precision));
          v[0] += 'vh';
          v[1] *= 100 / vh;
          v[1] = parseFloat(v[1].toFixed(params.precision));
          v[1] += 'vh';
        }
        else {
          v[0] = parseFloat(v[0].toFixed(params.precision));
          v[1] = parseFloat(v[1].toFixed(params.precision));
        }
        data[k] = v.join(' ');
      }
      else if(k === 'translatePath') {
        for(let j = 0; j < v.length; j++) {
          let v2;
          if(unit === 'rem') {
            v2 = parseFloat((v[j] / rem).toFixed(params.precision)) + 'rem';
          }
          else if(unit === 'vw') {
            v2 = parseFloat((v[j] * 100 / vw).toFixed(params.precision)) + 'vw';
          }
          else if(unit === 'vh') {
            v2 = parseFloat((v[j] * 100 / vw).toFixed(params.precision)) + 'vh';
          }
          else {
            v2 = parseFloat(v[j].toFixed(params.precision));
          }
          v[j] = v2;
        }
      }
      else if([
        'top', 'right', 'bottom', 'left', 'width', 'height',
        'translateX', 'translateY', 'translateZ', 'perspective', 'fontSize',
      ].indexOf(k) > -1) {
        let v2;
        if(unit === 'rem') {
          v2 = parseFloat((v / rem).toFixed(params.precision)) + 'rem';
        }
        else if(unit === 'vw') {
          v2 = parseFloat((v * 100 / vw).toFixed(params.precision)) + 'vw';
        }
        else if(unit === 'vh') {
          v2 = parseFloat((v * 100 / vw).toFixed(params.precision)) + 'vh';
        }
        else {
          v2 = parseFloat(v.toFixed(params.precision));
        }
        data[k] = v2;
      }
      // 无单位的小数
      else {
        v = v.toFixed(params.precision + 2);
        data[k] = parseFloat(v);
      }
    }
  }
  // 特殊的fill和stroke
  ['fill', 'stroke'].forEach(k => {
    if(data.hasOwnProperty(k)) {
      let v = data[k];
      if(Array.isArray(v)) {
        v.forEach((item, i) => {
          if(/Gradient/i.test(item)) {
            v[i] = v[i].replace(/([\s(])([+-]?[\d.]+)/g, function($0, $1, $2) {
              if(unit === 'rem') {
                return $1 + (parseFloat($2) / rem).toFixed(params.precision + 2);
              }
              else if(unit === 'vw') {
                return $1 + (parseFloat($2) * 100 / vw).toFixed(params.precision + 2);
              }
              else if(unit === 'vh') {
                return $1 + (parseFloat($2) * 100 / vh).toFixed(params.precision + 2);
              }
              else {
                return $1 + parseFloat($2).toFixed(params.precision + 2);
              }
            });
          }
        });
      }
    }
  });
}

function parseAnimate(data, params) {
  let { value, options } = data;
  for(let i = 0, len = value.length; i < len; i++) {
    let item = value[i];
    parseStyle(item, params);
    if(item.hasOwnProperty('offset')) {
      let v = item.offset.toFixed(params.precision + 2);
      item.offset = parseFloat(v);
    }
    if(item.hasOwnProperty('easing')) {
      let v = item.easing;
      let v2 = [];
      for(let i = 0, len = v.length; i < len; i++) {
        v2[i] = parseFloat(v[i].toFixed(params.precision + 2));
      }
      item.easing = v2;
    }
    if(item.hasOwnProperty('points')) {
      parsePoint(item.points, params);
    }
    if(item.hasOwnProperty('controls')) {
      parsePoint(item.controls, params);
    }
  }
  if(options.hasOwnProperty('duration')) {
    let v = options.duration.toFixed(params.precision);
    options.duration = parseFloat(v);
  }
}

export default function(data, params) {
  let imgHash = params.imgHash = {};
  recursion(data, params);
  let library = data.library;
  if(Array.isArray(library)) {
    for(let i = 0, len = library.length; i < len; i++) {
      recursion(library[i], params);
    }
  }
  let imgs = [];
  for(let i in imgHash) {
    if(imgHash.hasOwnProperty(i)) {
      imgs.push(imgHash[i]);
    }
  }
  if(imgs.length) {
    data.imgs = imgs;
  }
};
