import React from 'react';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';

import './index.less';
import global from '../../store/global';

@inject('global')
@observer
class Alert extends React.Component {
  render() {
    return <div className={classnames('alert', {
      show: !!this.props.global.alert,
    })}>
      <div className="bg"/>
      <div className="panel">
        <div className="c">{this.props.global.alert}</div>
        <div className="btn" onClick={() => {
          global.setAlert('');
        }}>确定</div>
      </div>
    </div>;
  }
}

export default Alert;
