'use strict';

import { csInterface } from './util/CSInterface';
import enums from '../es/enums';

import './index.html';
import './index.less'

csInterface.addEventListener(enums.EVENT.INIT, function(event) {
  console.log(event);
});

csInterface.addEventListener(enums.EVENT.LOG, function(event) {
  console.log(event.data);
});

// 通知es初始化获取展示合成列表，不发送的话es那边不执行任何代码很神奇
csInterface.evalScript('$.ae2karas.getCompositions();');
