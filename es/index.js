import enums from './enums';
import convert from './convert';

const { ES_TYPE, EVENT } = enums;

let ae2karas = $.ae2karas = $.ae2karas || {};

ae2karas.dispatch = (function() {
  let xLib;
  try {
    xLib = new ExternalObject('lib:PlugPlugExternalObject');
  } catch(e) {
    alert("Missing ExternalObject: ");
  }
  return function(type, data) {
    if(xLib) {
      if(data && data instanceof Object) {
        data = JSON.stringify(data);
      }
      if(typeof data === 'number') {
        // data = data.toString();
      }
      var eventObj = new CSXSEvent();
      eventObj.type = type;
      eventObj.data = data || '';
      eventObj.dispatch();
    }
  };
})();

function getItemType(item) {
  let getType = {};
  let type = getType.toString.call(item);
  switch(type) {
    case '[object FolderItem]':
      return ES_TYPE.FOLDER_ITEM;
    case '[object FootageItem]':
      return ES_TYPE.FOOTAGE_ITEM;
    case '[object CompItem]':
      return ES_TYPE.COMP_ITEM;
  }
  return type;
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
  let composition = findCompositionById(id);
  if(!composition) {
    $.ae2karas.dispatch(enums.EVENT.CONVERT, null);
    return;
  }
  let res = convert(composition);
  $.ae2karas.dispatch(enums.EVENT.CONVERT, res);
};
