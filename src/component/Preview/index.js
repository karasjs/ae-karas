import React from 'react';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';

import store from '../../store';

import './index.less';

@inject('preview')
@observer
class Preview extends React.Component {
  render() {
    return <div className={classnames('preview-panel', {
      show: store.preview.isShow,
    })}>1</div>
  }
}

export default Preview;
