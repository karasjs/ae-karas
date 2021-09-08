import React from 'react';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';

import store from '../../store';
import Composition from '../Composition';
import { csInterface } from '../../util/CSInterface';

import './index.less';

@inject('global')
@observer
class List extends React.Component {
  render() {
    return <div className={classnames('list-panel', {
      show: !this.props.global.isPreview,
    })}>
      <div className="btn">
        <div className="convert" onClick={() => {
          if(store.composition.currentId) {
            store.global.setLoading(true);
            csInterface.evalScript(`$.ae2karas.convert(${store.composition.currentId})`);
          }
          else {
            alert('请先选择合成');
          }
        }}>转换</div>
        <div className="refresh" onClick={() => {
          store.composition.setCurrent(null);
          csInterface.evalScript('$.ae2karas.getCompositions();');
        }}>刷新</div>
      </div>
      <div className="choose">请选择合成：</div>
      <Composition/>
    </div>
  }
}

export default List;
