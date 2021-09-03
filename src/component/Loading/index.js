import React from 'react';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';

import './index.less';

@inject('global')
@observer
class Loading extends React.Component {
  render() {
    return <div className={classnames('loading', {
      show: this.props.global.isLoading,
    })}>
      <b/>
    </div>;
  }
}

export default Loading;
