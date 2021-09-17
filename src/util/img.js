let canvas = document.createElement('canvas');
let count = 0, total = 0;
let maxW = 0, maxH = 0;

function recursion(data, cb) {
  // 分为普通节点和library节点
  if(data.hasOwnProperty('libraryId')) {
  }
  else {
    if(data.props) {
      base64(data.props, cb);
    }
    let children = data.children;
    if(Array.isArray(children)) {
      for(let i = 0, len = children.length; i < len; i++) {
        recursion(children[i], cb);
      }
    }
  }
}

function base64(data, cb) {
  if(data.hasOwnProperty('src')) {
    let { src, style: { width, height } } = data;
    total++;
    let img = document.createElement('img');
    img.onload = function() {
      maxW = Math.max(maxW, width);
      maxH = Math.max(maxH, height);
      let ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, maxW, maxH);
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      if(/\.jpe?g$/.test(src)) {
        data.src = canvas.toDataURL('image/jpeg');
      }
      else {
        data.src = canvas.toDataURL('image/png');
      }
      if(++count === total) {
        cb();
      }
    };
    img.onerror = function() {
      if(++count === total) {
        cb();
      }
    };
    img.src = src;
  }
}

export default function(data, cb) {
  count = total = maxW = maxH = 0;
  let library = data.library;
  if(Array.isArray(library)) {
    for(let i = 0, len = library.length; i < len; i++) {
      recursion(library[i], cb);
    }
  }
};
