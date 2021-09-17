import React from 'react';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';
import karas from 'karas';

import store from '../../store';
import { csInterface } from '../../util/CSInterface';
import output from '../../util/output';
import img from '../../util/img';

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
    // let controller = root.animateController;
    // if(controller && controller.list.length) {
    //   controller.iterations = Infinity;
    // }
  }

  change(v) {
    store.preview.setType(v);
  }

  changeIterations(e) {
    let n = parseInt(e.target.value);
    if(!n) {
      n = 'Infinity';
    }
    store.preview.setIterations(n);
  }

  changePrecision(e) {
    let n = parseInt(e.target.value);
    if(!n) {
      n = 0;
    }
    store.preview.setPrecision(n);
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
        <div className="side">
          <label>
            <input type="checkbox"
                   ref={el => this.format = el}
                   defaultChecked={this.props.preview.format}/>
            <span>格式化</span>
          </label>
          <label>
            <input type="checkbox"
                   ref={el => this.base64 = el}
                   defaultChecked={this.props.preview.base64}/>
            <span>图片base64</span>
          </label>
          <label>
            <span>循环次数(0为无穷)</span>
            <input type="number" min="0"
                   defaultValue={this.props.preview.iterations}
                   onChange={e => this.changeIterations(e)}/>
          </label>
          <label>
            <span>小数精度(0为无穷)</span>
            <input type="number" min="0"
                   defaultValue={this.props.preview.precision}
                   onChange={e => this.changePrecision(e)}/>
          </label>
          <div className="btn">
            <div className="export" onClick={() => {
              let { data, iterations, precision } = this.props.preview;
              let { format, base64 } = this;
              data = JSON.parse(JSON.stringify(data));
              output(data, {
                iterations,
                precision,
              });
              function cb() {
                let str = format.checked ? JSON.stringify(data, null, 2) : JSON.stringify(data);
                str = str.replace(/'/g, '\\\'');
                str = str.replace(/\n/g, '\\\n');
                csInterface.evalScript(`$.ae2karas.export('${str}')`);
                store.global.setAlert('导出成功！');
              }
              if(base64.checked) {
                img.base64(data, cb);
              }
              else {
                cb();
              }
            }}>导出</div>
            <div className="upload" onClick={() => {
              let { data, iterations, precision } = this.props.preview;
              let { format, base64 } = this;
              let name = data.name;
              data = JSON.parse(JSON.stringify(data));
              output(data, {
                iterations,
                precision,
              });
              function cb() {
                store.global.setLoading(true);
                let str = format.checked ? JSON.stringify(data, null, 2) : JSON.stringify(data);
                str = str.replace(/'/g, '\\\'');
                let blob = new Blob([str], {
                  type: 'application/json',
                });
                let file = new File([blob], name + '.json', {
                  type: 'application/json',
                });
                let formData = new FormData();
                formData.append(file.name, file);
                formData.append('mode', 'public');
                fetch(img.UPLOAD_JSON, {
                  method: 'POST',
                  body: formData,
                }).then(res => res.json()).then(function(res) {
                  store.global.setLoading(false);
                  console.log(res);
                  if(res.success && res.result) {
                    store.global.setAlert('已上传至：\n' + res.result);
                  }
                }).catch(function(e) {
                  store.global.setLoading(false);
                  store.global.setAlert('上传失败！');
                });
              }
              if(base64.checked) {
                img.base64(data, cb);
              }
              else {
                img.upload(data, cb);
              }
            }}>上传</div>
          </div>
        </div>
      </div>
    </div>
  }
}

export default Preview;
