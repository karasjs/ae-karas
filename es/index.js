import enums from './enums';
import parse from './parse/index';
import convert from './convert/index';
import json from './json';

const { ES_TYPE, EVENT } = enums;

Array.isArray = Array.isArray || function(arr) {
  return arr instanceof Array;
};

Array.prototype.indexOf = Array.prototype.indexOf || function(o) {
  for(let i = 0, len = this.length; i < len; i++) {
    if(this[i] === o) {
      return i;
    }
  }
  return -1;
};

let ae2karas = $.ae2karas = $.ae2karas || {};
json(ae2karas);

ae2karas.dispatch = (function() {
  let xLib;
  try {
    xLib = new ExternalObject('lib:PlugPlugExternalObject');
  } catch(e) {
    alert('Missing ExternalObject: ');
  }
  return function(type, data) {
    if(xLib) {
      if(data && data instanceof Object) {
        data = ae2karas.JSON.stringify(data);
      }
      else if(data === undefined) {
        data = 'undefined';
      }
      else if(data === null) {
        data = 'null';
      }
      else if(data === true) {
        data = 'true';
      }
      else if(data === false) {
        data = 'false';
      }
      var eventObj = new CSXSEvent();
      eventObj.type = type;
      eventObj.data = data;
      eventObj.dispatch();
    }
  };
})();

ae2karas.log = function(s) {
  $.ae2karas.dispatch(enums.EVENT.LOG, s);
};

ae2karas.warn = function(s) {
  $.ae2karas.dispatch(enums.EVENT.WARN, s);
};

ae2karas.error = function(s) {
  $.ae2karas.dispatch(enums.EVENT.ERROR, s);
};

function getItemType(item) {
  if(item instanceof CompItem) {
    return ES_TYPE.COMP_ITEM;
  }
  if(item instanceof FolderItem) {
    return ES_TYPE.FOLDER_ITEM;
  }
  if(item instanceof FootageItem) {
    return ES_TYPE.FOOTAGE_ITEM;
  }
  return ES_TYPE.UNKNOWN;
}

ae2karas.getCompositions = function() {
  let folderItem = app.project;
  let list = [];
  // 所有的合成都在app.project下，包含文件夹递归树的
  for(let i = 1; i <= folderItem.numItems; i++) {
    let compItem = folderItem.item(i);
    let type = getItemType(compItem);
    if(type === ES_TYPE.COMP_ITEM) {
      list.push({
        id: compItem.id,
        name: compItem.name,
        width: compItem.width,
        height: compItem.height,
        type,
      });
    }
  }
  $.ae2karas.dispatch(EVENT.INIT, list);
};

function findCompositionById(id) {
  for(let i = 1; i <= app.project.numItems; i++) {
    const compItem = app.project.item(i);
    if(compItem.id === id) {
      return compItem;
    }
  }
  return null;
}

ae2karas.convert = function(id) {
  $.ae2karas.error('start');
  let composition = findCompositionById(id);
  if(!composition) {
    $.ae2karas.error('error: no composition');
    $.ae2karas.dispatch(enums.EVENT.CANCEL);
    return;
  }
  // 递归遍历分析合成对象，转换ae的图层为普通js对象，留给后续转换karas用
  let res = parse(composition);
  $.ae2karas.dispatch(enums.EVENT.FINISH, convert(res));
  // 结束后才能删除临时生成的导出psd的合成和渲染队列
  $.ae2karas.delTemp();
  $.ae2karas.error('finish');
};

let list = [];
ae2karas.addTemp = function(o) {
  list.push(o);
};
ae2karas.delTemp = function() {
  while(list.length) {
    list.pop().remove();
  }
};

ae2karas.export = function(data) {
  $.ae2karas.error('export');
  $.ae2karas.log(data);
  let file = File.saveDialog();
  if(!file) {
    return;
  }
  let name = file.fsName;
  if(!/\.json$/.test(name)) {
    name += '.json';
  }
  let f = new File(name);
  f.open('w');
  f.encoding = 'utf-8';
  f.write(data);
  f.close();
  return true;
};
