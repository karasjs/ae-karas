import React from 'react';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';

import store from '../../store';
import Composition from '../Composition';
import { csInterface } from '../../util/CSInterface';

import './index.less';

@inject('global')
// @inject('composition')
@observer
class List extends React.Component {
  // componentDidUpdate() {
  //   let id = this.props.composition.currentId;
  //   if(id && this.props.global.isLoading) {
  //     csInterface.evalScript(`$.ae2karas.convert(${id})`);
  //   }
  // }

  render() {
    return <div className={classnames('list-panel', {
      show: !this.props.global.isPreview,
    })}>
      <div className="btn">
        <div className="convert" onClick={() => {
          if(store.composition.currentId) {
            store.global.setLoading(true);
            setTimeout(function() {
              csInterface.evalScript(`$.ae2karas.convert(${store.composition.currentId})`);
            }, 100);
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
