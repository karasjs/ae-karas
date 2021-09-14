import React from 'react';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';
import karas from 'karas';

import store from '../../store';

import './index.less';

let root, canvas;

@inject('global')
@inject('preview')
@observer
class Preview extends React.Component {
  componentDidUpdate(nextProps, nextState, nextContext) {
    let data = this.props.preview.data;
    let type = this.props.preview.type;
    let { width, height } = data.props.style;
    let stage = this.stage;
    if(root) {
      root.destroy();
      root = null;
      stage.innerHTML = '';
    }
    root = karas.parse({
      tagName: type,
      props: {
        width,
        height,
      },
      children: [
        karas.parse(data, {
          // autoPlay: false,
        })
      ],
      abbr: false,
    }, stage);
    let { clientWidth, clientHeight } = stage;
    let rw = width / clientWidth;
    let rh = height / clientHeight;
    let max = Math.max(rw, rh) * 1.05;
    canvas = stage.querySelector('canvas');
    if(canvas) {
      canvas.style.width = width / max + 'px';
      canvas.style.height = height / max + 'px';
    }
    let controller = root.animateController;
    if(controller && controller.list.length) {
      controller.iterations = Infinity;
    }
  }

  change(v) {
    store.preview.setType(v);
  }

  render() {
    let type = this.props.preview.type;
    return <div className={classnames('preview-panel', {
      show: store.global.isPreview,
    })}>
      <div className="btn">
        <div className="return" onClick={() => {
          if(root) {
            root.destroy();
            root = null;
          }
          store.global.setPreview(false);
        }}>返回</div>
      </div>
      <div className="type">
        <label onClick={() => this.change('canvas')}>
          <input type="radio"
                 name="type"
                 value="canvas"
                 checked={type === 'canvas'}
                 readOnly={true}/>
          <span>canvas</span>
        </label>
        <label onClick={() => this.change('svg')}>
          <input type="radio"
                 name="type"
                 value="svg"
                 checked={type === 'svg'}
                 readOnly={true}/>
          <span>svg</span>
        </label>
        <label onClick={() => this.change('webgl')}>
          <input type="radio"
                 name="type"
                 value="webgl"
                 checked={type === 'webgl'}
                 readOnly={true}/>
          <span>webgl</span>
        </label>
      </div>
      <div className="container">
        <div className="menu"/>
        <div className="stage" ref={el => this.stage = el}/>
        <div className="side"/>
      </div>
    </div>
  }
}

export default Preview;
