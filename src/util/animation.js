function getDuration(data) {
  let animate = data.animate;
  if(Array.isArray(animate) && animate.length) {
    return data.animate[0].options.duration;
  }
  let children = data.children;
  if(Array.isArray(children)) {
    for(let i = 0, len = children.length; i < len; i++) {
      let child = children[i];
      let res = getDuration(child);
      if(res !== undefined) {
        return res;
      }
    }
  }
}

function getKeyFrames(data, list, hash) {
  let animate = data.animate;
  if(Array.isArray(animate)) {
    for(let i = 0, len = animate.length; i < len; i++) {
      let item = animate[i].value;
      for(let j = 0, len2 = item.length; j < len2; j++) {
        let offset = item[j].offset || 0;
        if(!hash.hasOwnProperty(offset)) {
          hash[offset] = true;
          list.push(offset);
        }
      }
    }
  }
  let children = data.children;
  if(Array.isArray(children)) {
    for(let i = 0, len = children.length; i < len; i++) {
      let child = children[i];
      getKeyFrames(child, list, hash);
    }
  }
}

export default {
  getDuration(data) {
    let res = getDuration(data);
    if(res !== undefined) {
      return res;
    }
    let library = data.library;
    for(let i = 0, len = library.length; i < len; i++) {
      let item = library[i];
      let res = getDuration(item);
      if(res !== undefined) {
        return res;
      }
    }
    return 0;
  },
  getKeyFrames(data) {
    let list = [], hash = {};
    getKeyFrames(data, list, hash);
    let library = data.library;
    for(let i = 0, len = library.length; i < len; i++) {
      let item = library[i];
      getKeyFrames(item, list, hash);
    }
    return list.sort(function(a, b) {
      return a - b;
    });
  },
};
