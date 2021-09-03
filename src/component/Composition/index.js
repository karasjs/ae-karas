import React from 'react';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';

import store from '../../store';
import { csInterface } from '../../util/CSInterface';

import './index.less';

@inject('composition')
@observer
class Composition extends React.Component {
  click(id) {
    store.composition.setCurrent(id);
  }

  preview(id) {
    store.preview.setShow(true);
    // 通知es转换合成对象
    csInterface.evalScript(`$.ae2karas.convert(${id});`);
  }

  render() {
    return <div className="composition">
      <table>
        <thead>
        <tr>
          <th className="checkbox">选中</th>
          <th className="name">合成名称</th>
        </tr>
        </thead>
        <tbody>
        {
          this.props.composition.list.map(item => {
            return <tr className={classnames({
              checked: item.id === this.props.composition.currentId,
            })} key={item.id}>
              <td className="checkbox" onClick={() => this.click(item.id)}/>
              <td className="name" onClick={() => this.click(item.id)}>{item.name}</td>
            </tr>;
          })
        }
        </tbody>
      </table>
    </div>
  }
}

export default Composition;
