import React from 'react';
import ReactDom from 'react-dom';
import { Provider } from 'mobx-react';

import store from './store';
import Composition from './component/Composition';
import Preview from './component/Preview';
import { csInterface } from './util/CSInterface';
import enums from '../es/enums';

import './index.html';
import './index.less';

ReactDom.render(
  <Provider {...store}>
    <div className="btn">
      <div className="convert">转换</div>
      <div className="refresh">刷新</div>
    </div>
    <div className="choose">请选择合成：</div>
    <Composition/>
    <Preview/>
  </Provider>,
  document.querySelector('#root')
);

csInterface.addEventListener(enums.EVENT.INIT, function(event) {
  store.composition.update(event.data);
});

csInterface.addEventListener(enums.EVENT.LOG, function(event) {
  console.log(event.data);
});

// 通知es初始化获取展示合成列表，不发送的话es那边不执行任何代码很神奇
csInterface.evalScript('$.ae2karas.getCompositions();');
