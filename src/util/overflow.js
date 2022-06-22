import karas from 'karas';
import animation from './animation';

let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');
let uuid = 0;

function collect(data, hash) {
  // 分为普通节点和library节点，overflow只会出现在library的div上
  if(data.hasOwnProperty('libraryId')) {
  }
  else {
    if(data.props && data.props.style && data.props.style.overflow === 'hidden') {
      hash[uuid] = {
        data,
        record: {},
      };
      data.props.overflowId = uuid++;
    }
    let children = data.children;
    if(Array.isArray(children)) {
      for(let i = 0, len = children.length; i < len; i++) {
        collect(children[i], hash);
      }
    }
  }
}

function recursion(node, time, hash) {
  let { tagName, props, children } = node;
  if(['div', 'canvas', 'svg', 'webgl'].indexOf(tagName) > -1) {
    if(props.style && props.style.overflow === 'hidden') {
      let overflowId = props.overflowId;
      // 先看有没有记录防止重复
      if(!hash[overflowId].record.hasOwnProperty(time)) {
        hash[overflowId].record[time] = true;
        let p = node.getBoundingClientRect().points;
        let vertexes = [
          p[0],
          p[1],
          p[2],
          p[3],
        ];
        // 第一次深度遍历不检测，因为root和node相等本身
        let obj = hash[overflowId];
        checkOverflow(node, node, vertexes, obj);
      }
    }
    if(Array.isArray(children)) {
      for(let i = 0, len = children.length; i < len; i++) {
        recursion(children[i], time, hash);
      }
    }
  }
}

function checkOverflow(root, node, vertexes, obj) {
  if(node !== root) {
    let p = node.getBoundingClientRect(true).points;
    // 4个顶点都在root的vertexes内就不出界
    if(!karas.math.geom.pointInConvexPolygon(p[0][0], p[0][1], vertexes)) {
      return true;
    }
    if(!karas.math.geom.pointInConvexPolygon(p[1][0], p[1][1], vertexes)) {
      return true;
    }
    if(!karas.math.geom.pointInConvexPolygon(p[2][0], p[2][1], vertexes)) {
      return true;
    }
    if(!karas.math.geom.pointInConvexPolygon(p[3][0], p[3][1], vertexes)) {
      return true;
    }
  }
  let children = node.children;
  if(Array.isArray(children)) {
    for(let i = 0, len = children.length; i < len; i++) {
      let child = children[i];
      if(child instanceof karas.Text) {
        continue;
      }
      let overflow = checkOverflow(root, child, vertexes, obj);
      // 超出可以打标并提前跳出
      if(overflow) {
        obj.isOverflow = true;
        return;
      }
    }
  }
}

export default function(type, data, cb) {
  console.error('overflow');
  // 收集所有overflow:hidden的，并且存入hash和props上打标
  let hash = {};
  let library = data.library;
  for(let i = 0, len = library.length; i < len; i++) {
    collect(library[i], hash);
  }
  let duration = animation.getDuration(data);
  let kfs = animation.getKeyFrames(data, ['rotateZ', 'translateX', 'translateY', 'scaleX', 'scaleY']);
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
  // 结束回调前去除多余的overflow以及打标的id
  function finish() {
    for(let overflowId in hash) {
      if(hash.hasOwnProperty(overflowId)) {
        let { data, isOverflow } = hash[overflowId];
        if(!isOverflow) {
          delete data.props.style.overflow;
        }
        delete data.props.overflowId;
      }
    }
    cb();
  }
  function task() {
    if(kfs.length) {
      let time = kfs.pop() * duration;
      animateController.gotoAndStop(time, function() {
        recursion(root, time, hash);
        setTimeout(task, 1);
      });
    }
    else {
      finish();
    }
  }
  task();
}
