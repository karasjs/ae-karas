let canvas = document.createElement('canvas');
let count = 0, total = 0;
let maxW = 0, maxH = 0;

function recursionBase64(data, cb) {
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
        recursionBase64(children[i], cb);
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
      else if(/\.webp$/.test(src)) {
        data.src = canvas.toDataURL('image/webp');
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

function recursionUpload(data, cb) {
  // 分为普通节点和library节点
  if(data.hasOwnProperty('libraryId')) {
  }
  else {
    if(data.props) {
      upload(data.name, data.props, cb);
    }
    let children = data.children;
    if(Array.isArray(children)) {
      for(let i = 0, len = children.length; i < len; i++) {
        recursionUpload(children[i], cb);
      }
    }
  }
}

function upload(name, data, cb) {
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
      let str;
      if(/\.jpe?g$/.test(src)) {
        str = canvas.toDataURL('image/jpeg');
      }
      else if(/\.webp$/.test(src)) {
        str = canvas.toDataURL('image/webp');
      }
      else {
        str = canvas.toDataURL('image/png');
      }
      fetch(UPLOAD_BASE64, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imgData: str,
          fileName: name,
          needCompress: true,
        }),
      }).then(res => res.json()).then(function(res) {
        if(res.success) {
          data.src = res.url;
        }
        if(++count === total) {
          cb();
        }
      }).catch(function(e) {
        if(++count === total) {
          cb();
        }
      });
    };
    img.onerror = function() {
      if(++count === total) {
        cb();
      }
    };
    img.src = src;
  }
}

const UPLOAD_JSON = '';
const UPLOAD_BASE64 = '';

export default {
  base64(data, cb) {
    count = total = maxW = maxH = 0;
    let library = data.library;
    if(Array.isArray(library)) {
      for(let i = 0, len = library.length; i < len; i++) {
        recursionBase64(library[i], cb);
      }
    }
  },
  upload(data, cb) {
    count = total = maxW = maxH = 0;
    let library = data.library;
    if(Array.isArray(library)) {
      for(let i = 0, len = library.length; i < len; i++) {
        recursionUpload(library[i], cb);
      }
    }
  },
  UPLOAD_JSON,
  UPLOAD_BASE64,
};