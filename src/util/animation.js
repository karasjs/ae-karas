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

function getKeyFrames(data, list, hash, ks) {
  let animate = data.animate;
  if(Array.isArray(animate)) {
    for(let i = 0, len = animate.length; i < len; i++) {
      let item = animate[i].value;
      if(item.length && item.length > 1) {
        let one = item[1];
        // 传入必需的关键帧样式key则要包含，否则为全部
        let has = !Array.isArray(ks);
        if(!has) {
          for(let j = 0, len2 = ks.length; j < len2; j++) {
            if(one.hasOwnProperty(ks[j])) {
              has = true;
              break;
            }
          }
        }
        if(has) {
          for(let j = 0, len2 = item.length; j < len2; j++) {
            let offset = item[j].offset || 0;
            if(!hash.hasOwnProperty(offset)) {
              hash[offset] = true;
              list.push(offset);
            }
          }
        }
      }
    }
  }
  let children = data.children;
  if(Array.isArray(children)) {
    for(let i = 0, len = children.length; i < len; i++) {
      let child = children[i];
      getKeyFrames(child, list, hash, ks);
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
  getKeyFrames(data, ks) {
    let list = [0], hash = {0:true};
    getKeyFrames(data, list, hash, ks);
    let library = data.library;
    for(let i = 0, len = library.length; i < len; i++) {
      let item = library[i];
      getKeyFrames(item, list, hash, ks);
    }
    return list.sort(function(a, b) {
      return a - b;
    });
  },
};
