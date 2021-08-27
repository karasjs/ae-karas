import enums from '../enums';

export default function(prop, library) {
  $.ae2karas.dispatch(enums.EVENT.WARN, 'vector: ' + prop.name);
  let res = {};
  for(let i = 1; i <= prop.numProperties; i++) {
    let item = prop.property(i);
    if(item && item.enabled) {
      let matchName = item.matchName;
      $.ae2karas.dispatch(enums.EVENT.LOG, 'vector2: ' + matchName);
      switch(matchName) {
        case 'ADBE Vector Group':
          // 一组矢量，类似一个图层
          for(let j = 1; j <= item.numProperties; j++) {
            let item2 = item.property(j);
            if(item2 && item2.enabled) {
              let matchName2 = item2.matchName;
              $.ae2karas.dispatch(enums.EVENT.LOG, 'vector3: ' + matchName2);
            }
          }
          break;
        case 'ADBE Vector Shape - Rect':
          break;
        case 'ADBE Vector Shape - Ellipse':
          break;
        case 'ADBE Vector Shape - Star':
          break;
        case 'ADBE Vector Shape - Group':
          break;
        case 'ADBE Vector Shape - Gro':
          break;
        case 'ADBE Vector Graphic - Fill':
          break;
        case 'ADBE Vector Graphic - G-Fill':
          break;
        case 'ADBE Vector Filter - Trim':
          break;
        case 'ADBE Vector Graphic - Stroke':
          break;
        case 'ADBE Vector Graphic - G-Stroke':
          break;
      }
    }
  }
  return res;
};
