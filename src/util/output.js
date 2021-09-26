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
    let animate = data.animate;
    if(Array.isArray(animate)) {
      for(let i = 0, len = animate.length; i < len; i++) {
        parseAnimate(animate[i], params);
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
    }
    let children = data.children;
    if(Array.isArray(children)) {
      for(let i = 0, len = children.length; i < len; i++) {
        recursion(children[i], params);
      }
    }
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
  for(let i = 0, len = STYLE.length; i < len; i++) {
    let k = STYLE[i];
    if(data.hasOwnProperty(k)) {
      let v = data[k];
      if(k === 'transformOrigin') {
        v = v.split(' ');
        v[0] = parseFloat(parseFloat(v[0]).toFixed(params.precision));
        v[1] = parseFloat(parseFloat(v[1]).toFixed(params.precision));
        data[k] = v.join(' ');
      }
      else if(['opacity', 'scaleX', 'scaleY', 'scaleZ'].indexOf(k) > -1) {
        v = v.toFixed(params.precision + 2);
        data[k] = parseFloat(v);
      }
      else {
        v = v.toFixed(params.precision);
        data[k] = parseFloat(v);
      }
    }
  }
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
  }
  if(options.hasOwnProperty('duration')) {
    let v = options.duration.toFixed(params.precision);
    options.duration = parseFloat(v);
  }
}

export default function(data, params) {
  recursion(data, params);
  let library = data.library;
  if(Array.isArray(library)) {
    for(let i = 0, len = library.length; i < len; i++) {
      recursion(library[i], params);
    }
  }
};
