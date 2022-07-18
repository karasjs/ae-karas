import React from 'react';
import { observer, inject } from 'mobx-react';
import { transaction } from 'mobx';
import classnames from 'classnames';

import './index.less';
import global from '../../store/global';
import preview from '../../store/preview';

@inject('global')
@inject('preview')
@observer
class Resize extends React.Component {
  change(e, isWidth) {
    let { img: { props: { style: { width, height } } } } = this.props.preview;
    let n = parseInt(e.target.value) || 1;
    let keep = this.keep.checked;
    let ratio = width / height;
    let w = parseInt(this.w.value) || 1;
    let h = parseInt(this.h.value) || 1;
    if(isWidth) {
      if(keep) {
        this.h.value = Math.round(w / ratio) || 1;
      }
    }
    else {
      if(keep) {
        this.w.value = Math.round(h * ratio) || 1;
      }
    }
  }

  render() {
    let { img } = this.props.preview;
    if(!img) {
      return null;
    }
    return <div className={classnames('resize', {
      show: !!this.props.global.isResize,
    })}>
      <div className="bg"/>
      <div className="panel">
        <div className="name">{img.name}</div>
        <div className="size">{img.props.style.width}px * {img.props.style.height}px</div>
        <div className="input">
          <label><input type="number"
                        min="1"
                        step="1"
                        defaultValue={img.props.nw || img.props.style.width}
                        ref={el => this.w = el}
                        onChange={e => this.change(e, true)}/>新宽</label>
          <label><input type="number"
                        min="1"
                        step="1"
                        defaultValue={img.props.nh || img.props.style.height}
                        ref={el => this.h = el}
                        onChange={e => this.change(e, false)}/>新高</label>
          <label><input type="checkbox"
                        defaultChecked={true}
                        ref={el => this.keep = el}/>保持宽高比</label>
        </div>
        <div className="btn" onClick={() => {
          transaction(() => {
            let w = parseInt(this.w.value) || 1;
            let h = parseInt(this.h.value) || 1;
            if(w !== img.props.style.width) {
              img.props.nw = w;
            }
            else {
              delete img.props.nw;
            }
            if(h !== img.props.style.height) {
              img.props.nh = h;
            }
            else {
              delete img.props.nh;
            }
            global.setResize(false);
            preview.setImg(null);
          });
        }}>确定</div>
      </div>
    </div>;
  }
}

export default Resize;
