import karas from 'karas';
import config from './config';
import animation from './animation';

let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');
// let canvas2 = document.createElement('canvas');
// let ctx2 = canvas2.getContext('2d');
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

function base64(props, cb) {
  if(props.hasOwnProperty('src')) {
    let { src, style: { width, height } } = props;
    total++;
    if(src.indexOf('data:') === 0) {
      // 模拟一个异步，防止只有1张base64或首张就是的情况直接cb返回
      setTimeout(function() {
        if(++count === total) {
          cb();
        }
      }, 1);
      return;
    }
    let img = document.createElement('img');
    img.onload = function() {
      width = width || img.width;
      height = height || img.height;
      maxW = Math.max(maxW, width);
      maxH = Math.max(maxH, height);
      ctx.clearRect(0, 0, maxW, maxH);
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      if(/\.jpe?g$/.test(src)) {
        props.src = canvas.toDataURL('image/jpeg');
      }
      else if(/\.webp$/.test(src)) {
        props.src = canvas.toDataURL('image/webp');
      }
      else {
        props.src = canvas.toDataURL('image/png');
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

function recursionUpload(data, imgHash, cb, isBase64) {
  // 分为普通节点和library节点
  if(data.hasOwnProperty('libraryId')) {
  }
  else {
    if(data.props) {
      upload(data.name, data.props, imgHash, cb, isBase64);
    }
    let children = data.children;
    if(Array.isArray(children)) {
      for(let i = 0, len = children.length; i < len; i++) {
        recursionUpload(children[i], imgHash, cb, isBase64);
      }
    }
  }
}

function upload(name, props, imgHash, cb, isBase64) {
  if(props.hasOwnProperty('src')) {
    let { src, style: { width, height } } = props;
    total++;
    maxW = Math.max(maxW, width);
    maxH = Math.max(maxH, height);
    if(src.indexOf('data:') === 0) {
      remote(src, props, cb, imgHash, isBase64);
      return;
    }
    let img = document.createElement('img');
    img.onload = function() {
      let ctx = canvas.getContext('2d');
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
      remote(str, props, cb, imgHash, isBase64);
    };
    img.onerror = function() {
      if(++count === total) {
        cb();
      }
    };
    img.src = src;
  }
}

function remote(str, props, cb, imgHash, isBase64) {
  fetch(config.UPLOAD_IMG, {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: str,
      quality: 0.8,
      returnBase64: isBase64,
    }),
  }).then(res => res.json()).then(function(res) {
    if(res.success) {
      if(isBase64) {
        props.src = res.base64;
      }
      else {
        props.src = res.url;
      }
      imgHash[res.url] = true;
    }
    if(++count === total) {
      cb();
    }
  }).catch(function() {
    if(++count === total) {
      cb();
    }
  });
}

function recursionGetAutoSize(node, hash) {
  let children = node.children;
  if(Array.isArray(children)) {
    for(let i = 0, len = children.length; i < len; i++) {
      let child = children[i];
      recursionGetAutoSize(child, hash);
      if(child.tagName === 'img') {
        let url = child.props.src;
        if(hash.hasOwnProperty(url)) {
          let { points } = child.getBoundingClientRect();
          let [p1, p2, p3] = points;
          let w = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
          let h = Math.sqrt(Math.pow(p2[0] - p3[0], 2) + Math.pow(p2[1] - p3[1], 2));
          let o = hash[url];
          o.width = Math.max(o.width, Math.ceil(w));
          o.height = Math.max(o.height, Math.ceil(h));
        }
      }
    }
  }
}

// function recursionSetAutoSize(node, ow, oh, nw, nh, sx, sy) {
//   delete node.id;
//   let style = node.props.style;
//   style.width = nw;
//   style.height = nh;
//   style.transformOrigin = '0 0';
//   style.scaleX = sx;
//   style.scaleY = sy;
// }

export default {
  manualSize(type, data, cb) {
    console.error('manualSize');
    let total = 0, count = 0;
    let library = data.library;
    for(let i = 0, len = library.length; i < len; i++) {
      let item = library[i];
      if(item.tagName === 'img' && item.props.nw && item.props.nh) {
        let url = item.props.src;
        total++;
        let img = document.createElement('img');
        img.onload = function() {
          canvas.width = item.props.nw;
          canvas.height = item.props.nh;
          maxW = Math.max(maxW, item.props.nw);
          maxH = Math.max(maxH, item.props.nh);
          ctx.clearRect(0, 0, maxW, maxH);
          ctx.drawImage(img, 0, 0, item.props.nw, item.props.nh);
          let str;
          if(/\.jpe?g$/.test(url)) {
            str = canvas.toDataURL('image/jpeg');
          }
          else if(/\.webp$/.test(url)) {
            str = canvas.toDataURL('image/webp');
          }
          else {
            str = canvas.toDataURL('image/png');
          }
          item.props.src = str;
          if(++count === total) {
            cb();
          }
        };
        img.onerror = function() {
          if(++count === total) {
            cb();
          }
        };
        img.src = url;
      }
    }
    if(total === 0) {
      cb();
    }
  },
  autoSize(type, data, cb) {
    console.error('autoSize');
    let hash = {}, total = 0, count = 0;
    let library = data.library;
    for(let i = 0, len = library.length; i < len; i++) {
      let item = library[i];
      // 排除手动尺寸
      if(item.tagName === 'img' && !item.props.nw && !item.props.nh) {
      // if(item.tagName === 'img') {
        total++;
        hash[item.props.src] = {
          index: i,
          width: 0,
          height: 0,
          node: item,
        };
      }
    }
    let duration = animation.getDuration(data);
    let kfs = animation.getKeyFrames(data, ['scaleX', 'scaleY']);
    let { width, height } = data.props.style;
    canvas.width = width;
    canvas.height = height;
    let root = karas.parse({
      tagName: 'canvas',
      props: {
        width,
        height,
      },
      children: [
        karas.parse(data, {
          autoPlay: false,
        }),
      ],
      abbr: false,
    }, canvas);
    let animateController = root.animateController;
    function setCb() {
      if(total === 0) {
        cb();
        return;
      }
      for(let url in hash) {
        if(hash.hasOwnProperty(url)) {
          let item = hash[url];
          let ow = item.node.props.style.width, oh = item.node.props.style.height;
          let scaleX = ow / item.width;
          let scaleY = oh / item.height;
          let dx = ow - item.width;
          let dy = oh - item.height;
          // 有可能缩放0，另外限制相差一定尺寸才进行修改
          if(item.width && item.height
            && (scaleX > 1.1 || scaleY > 1.1) && (dx > 20 || dy > 20)) {
            // library[item.index] = {
            //   id: item.node.id,
            //   tagName: 'div',
            //   props: {
            //     style: {
            //       position: 'absolute',
            //       width: ow,
            //       height: oh,
            //     },
            //   },
            //   children: [item.node],
            // };
            // 不能放大
            // if(scaleX < 1) {
            //   item.width = ow;
            //   scaleX = 1;
            // }
            // if(scaleY < 1) {
            //   item.height = oh;
            //   scaleY = 1;
            // }
            // recursionSetAutoSize(item.node, ow, oh, item.width, item.height, scaleX, scaleY);
            let img = document.createElement('img');
            img.onload = function() {
              canvas.width = item.width;
              canvas.height = item.height;
              maxW = Math.max(maxW, item.width);
              maxH = Math.max(maxH, item.height);
              ctx.clearRect(0, 0, maxW, maxH);
              ctx.drawImage(img, 0, 0, item.width, item.height);
              let str;
              if(/\.jpe?g$/.test(url)) {
                str = canvas.toDataURL('image/jpeg');
              }
              else if(/\.webp$/.test(url)) {
                str = canvas.toDataURL('image/webp');
              }
              else {
                str = canvas.toDataURL('image/png');
              }
              item.node.props.src = str;
              if(++count === total) {
                cb();
              }
            };
            img.onerror = function() {
              if(++count === total) {
                cb();
              }
            };
            img.src = url;
          }
          else if(++count === total) {
            cb();
          }
        }
      }
    }
    function task() {
      if(kfs.length) {
        if(duration) {
          let time = kfs.pop() * duration;
          animateController.gotoAndStop(time, function() {
            recursionGetAutoSize(root, hash);
            setTimeout(task, 1);
          });
        }
        else {
          recursionGetAutoSize(root, hash);
          setTimeout(setCb, 1);
        }
      }
      else {
        setCb();
      }
    }
    task();
  },
  cropBlank(type, data, cb) {
    console.error('cropBlank');
    let total = 0, count = 0;
    let library = data.library;
    for(let i = 0, len = library.length; i < len; i++) {
      let item = library[i];
      if(item.tagName === 'img') {
        let url = item.props.src;
        total++;
        let img = document.createElement('img');
        img.onload = function() {
          let width = img.width, height = img.height;
          canvas.width = width;
          canvas.height = height;
          maxW = Math.max(maxW, width);
          maxH = Math.max(maxH, height);
          ctx.clearRect(0, 0, maxW, maxH);
          ctx.drawImage(img, 0, 0, width, height);
          let x1 = 0, x2 = width - 1, y1 = 0, y2 = height - 1;
          let imageData = ctx.getImageData(0, 0, width, height).data;
          outer:
            for(let i = 0; i < height; i++) {
              for(let j = 0; j < width; j++) {
                let a = imageData[i * width * 4 + j * 4 + 3];
                if(a > 0) {
                  y1 = i;
                  break outer;
                }
              }
            }
          outer:
            for(let i = height - 1; i >= 0; i--) {
              for(let j = 0; j < width; j++) {
                let a = imageData[i * width * 4 + j * 4 + 3];
                if(a > 0) {
                  y2 = i;
                  break outer;
                }
              }
            }
          outer:
            for(let i = 0; i < width; i++) {
              for(let j = 0; j < height; j++) {
                let a = imageData[i * 4 + j * width * 4 + 3];
                if(a > 0) {
                  x1 = i;
                  break outer;
                }
              }
            }
          outer:
            for(let i = width - 1; i >= 0; i--) {
              for(let j = 0; j < height; j++) {
                let a = imageData[i * 4 + j * width * 4 + 3];
                if(a > 0) {
                  x2 = i;
                  break outer;
                }
              }
            }
          // 超过一定阈值才裁剪空白边
          if(x1 > 20 || x2 < width - 21 || y1 > 20 || y2 < height - 21) {
            console.log(x1, y1, x2, y2, width, height);
            let nw = x2 - x1, nh = y2 - y1;
            let nd = ctx.getImageData(x1, y1, nw, nh);
            canvas.width = nw;
            canvas.height = nh;
            ctx.clearRect(0, 0, maxW, maxH);
            ctx.putImageData(nd, 0, 0);
            let str;
            if(/\.jpe?g$/.test(url)) {
              str = canvas.toDataURL('image/jpeg');
            }
            else if(/\.webp$/.test(url)) {
              str = canvas.toDataURL('image/webp');
            }
            else {
              str = canvas.toDataURL('image/png');
            }
            let ow = item.props.style.width;
            let oh = item.props.style.height;
            let scaleX = ow / width, scaleY = oh / height;
            item.props.src = str;
            item.props.style.width = nw * scaleX;
            item.props.style.height = nh * scaleY;
            item.props.style.left = x1 * scaleX;
            item.props.style.top = y1 * scaleY;
            library[i] = {
              id: item.id,
              tagName: 'div',
              props: {
                style: {
                  position: 'absolute',
                  width: ow,
                  height: oh,
                },
              },
              children: [item],
            };
          }
          // let len = img.width * img.height;
          // for(let i = 0; i < len; i++) {
          //   let a = imageData[i * 4] + 3;
          //   if(a > 0) {
          //     y1 = Math.floor(i / img.width);
          //     break;
          //   }
          // }
          // for(let i = len - 1; i >= 0; i--) {
          //   let a = imageData[i * 4] + 3;
          //   if(a > 0) {
          //     y2 = Math.floor((len - i) / img.width);
          //     break;
          //   }
          // }
          if(++count === total) {
            cb();
          }
        }
        img.onerror = function() {
          if(++count === total) {
            cb();
          }
        }
        img.src = url;
      }
    }
    if(total === 0) {
      cb();
    }
  },
  base64(data, cb) {
    console.error('base64');
    count = total = maxW = maxH = 0;
    let library = data.library;
    if(Array.isArray(library)) {
      for(let i = 0, len = library.length; i < len; i++) {
        recursionBase64(library[i], cb);
      }
    }
    // 模拟一个异步，防止没有base64时需要cb返回
    setTimeout(function() {
      if(0 === total) {
        cb();
      }
    }, 1);
    delete data.imgs;
  },
  upload(data, cb, isBase64) {
    console.error('upload');
    let imgHash = {};
    count = total = maxW = maxH = 0;
    let library = data.library;
    function wrap() {
      let imgs = [];
      for(let i in imgHash) {
        if(imgHash.hasOwnProperty(i)) {
          imgs.push(i);
        }
      }
      if(imgs.length) {
        data.imgs = imgs;
      }
      cb();
    }
    if(Array.isArray(library)) {
      for(let i = 0, len = library.length; i < len; i++) {
        recursionUpload(library[i], imgHash, wrap, isBase64);
      }
    }
    // 模拟一个异步，防止没有图片时需要cb返回
    setTimeout(function() {
      if(0 === total) {
        cb();
      }
    }, 1);
  },
};
