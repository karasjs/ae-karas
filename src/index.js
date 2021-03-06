import React from 'react';
import ReactDom from 'react-dom';
import { transaction } from 'mobx';
import { Provider } from 'mobx-react';

import store from './store';
import List from './component/List';
import Preview from './component/Preview';
import Loading from './component/Loading';
import Resize from './component/Resize';
import Alert from './component/Alert';
import { csInterface } from './util/CSInterface';
import enums from '../es/enums';
import pkg from '../package.json';

import './index.html';
import './index.less';

ReactDom.render(
  <Provider {...store}>
    <List/>
    <Preview/>
    <Loading/>
    <Resize/>
    <Alert/>
    <div className="version">{pkg.version}</div>
  </Provider>,
  document.querySelector('#root')
);

csInterface.addEventListener(enums.EVENT.INIT, function(event) {
  store.composition.update(event.data);
});

csInterface.addEventListener(enums.EVENT.LOG, function(event) {
  console.log(event.data);
});

csInterface.addEventListener(enums.EVENT.WARN, function(event) {
  console.warn(event.data);
});

csInterface.addEventListener(enums.EVENT.ERROR, function(event) {
  console.error(event.data);
});

csInterface.addEventListener(enums.EVENT.FINISH, function(event) {
  console.warn(event.data);
  console.warn(JSON.stringify(event.data));
  transaction(function() {
    store.global.setLoading(false);
    store.preview.setData(event.data);
    store.global.setPreview(true);
  });
});

csInterface.addEventListener(enums.EVENT.CANCEL, function() {
  transaction(function() {
    store.global.setLoading(false);
    store.global.setPreview(false);
  });
});

// 通知es初始化获取展示合成列表，不发送的话es那边不执行任何代码很神奇
csInterface.evalScript('$.ae2karas.getCompositions();');
