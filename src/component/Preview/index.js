import React from 'react';
import { observer, inject } from 'mobx-react';
import { transaction } from 'mobx';
import classnames from 'classnames';
import karas from 'karas';

import store from '../../store';
import { csInterface } from '../../util/CSInterface';
import output from '../../util/output';
import img from '../../util/img';
import config from '../../util/config';

import './index.less';
import preview from '../../store/preview';

function formatTime(duration) {
  let str;
  if(duration >= 1000 * 60) {
    let m = Math.floor(duration / (1000 * 60));
    if(m < 10) {
      m = '0' + s;
    }
    str = m + ':';
    duration -= m * 1000 * 60;
  }
  else {
    str = '00:';
  }
  if(duration >= 1000) {
    let s = Math.floor(duration / 1000);
    if(s < 10) {
      s = '0' + s;
    }
    str += s + '.';
    duration -= s * 1000;
  }
  else {
    str += '00.';
  }
  if(duration > 0) {
    str += String(duration).slice(0, 1);
  }
  else {
    str += '0';
  }
  return str;
}

let root, uuid, type;
let isDrag, originX, W;

@inject('global')
@inject('preview')
@observer
class Preview extends React.Component {
  componentDidMount() {
    let self = this;
    let timeout;
    document.addEventListener('mousemove', function(e) {
      if(isDrag) {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          let pageX = e.pageX;
          let percent = (pageX - originX) / W;
          let animateController = root.animateController;
          if(animateController.list.length || animateController.__list2.length) {
            let list = animateController.list.length ? animateController.list : animateController.__list2;
            let time = percent * list[0].options.duration;
            if(time < 0) {
              time = 0;
            }
            else if(time > self.props.preview.total) {
              time = self.props.preview.total;
            }
            store.preview.setTime(time);
            animateController.gotoAndStop(time);
          }
        }, 10);
      }
    });
    document.addEventListener('mouseup', function(e) {
      isDrag = false;
      clearTimeout(timeout);
    });
    window.addEventListener('resize', () => {
      if(root) {
        let data = this.props.preview.data;
        let { width, height } = data.props.style;
        let stage = this.stage;
        let canvas = this.canvas;
        let { clientWidth, clientHeight } = stage;
        let rw = width / clientWidth;
        let rh = height / clientHeight;
        let max = Math.max(rw, rh);
        if(max < 1) {
          max = 1;
        }
        canvas.style.width = width / max + 'px';
        canvas.style.height = height / max + 'px';
        root.resize(width, height);
      }
    });
  }

  componentDidUpdate(nextProps, nextState, nextContext) {
    let data = this.props.preview.data;
    // 每次重新转换后新的才生成新的root
    if(data.uuid === uuid && this.props.preview.type === type) {
      return;
    }
    type = this.props.preview.type;
    uuid = data.uuid;
    // 缩放画布显示保持宽高比
    let { width, height } = data.props.style;
    store.preview.setVw(width);
    store.preview.setVh(height);
    let stage = this.stage;
    let canvas = this.canvas;
    let { clientWidth, clientHeight } = stage;
    let rw = width / clientWidth;
    let rh = height / clientHeight;
    let max = Math.max(rw, rh);
    if(max < 1) {
      max = 1;
    }
    canvas.style.width = width / max + 'px';
    canvas.style.height = height / max + 'px';
    if(root) {
      root.destroy();
      root = null;
      canvas.innerHTML = '';
    }
    // 不同类型type根节点
    root = karas.parse({
      tagName: type,
      props: {
        width,
        height,
      },
      children: [
        karas.parse(data, {
          autoPlay: false,
        })
      ],
      abbr: false,
    }, canvas);
    // 时间显示
    store.preview.setTime(0);
    let animateController = root.animateController;
    if(animateController.list.length) {
      store.preview.setTotal(animateController.list[0].options.duration);
    }
    else if(animateController.__list2.length) {
      store.preview.setTotal(animateController.__list2[0].options.duration);
    }
    else {
      store.preview.setTotal(0);
    }
    // 侦听root的refresh事件刷新时间和进度条
    animateController.on('frame', function() {
      store.preview.setTime(animateController.list[0].currentTime);
    });
    animateController.on('finish', function() {
      store.preview.setPlay(false);
    });
  }

  change(v) {
    store.preview.setType(v);
  }

  unit(v) {
    store.preview.setUnit(v);
  }

  changeRem(rem) {
    store.preview.setRem(rem);
  }

  changeVw(vw) {
    store.preview.setVw(vw);
  }

  changeVh(vh) {
    store.preview.setVh(vh);
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

  clickBg(v) {
    store.preview.setBgBlack(v);
  }

  clickPlay() {
    if(root) {
      store.preview.setPlay(true);
      if(this.props.preview.time === this.props.preview.total) {
        root.animateController.gotoAndPlay(0);
      }
      else {
        root.animateController.play();
      }
    }
  }

  clickPause() {
    if(root) {
      store.preview.setPlay(false);
      root.animateController.pause();
    }
  }

  mouseDown(e) {
    isDrag = true;
    let target = e.target.parentNode;
    W = e.target.parentNode.clientWidth;
    originX = target.offsetLeft;
    while(target.parentNode) {
      target = target.parentNode;
      originX += target.offsetLeft || 0;
    }
    if(root) {
      let animateController = root.animateController;
      animateController.pause();
    }
  }

  clickProgress(e) {
    let target = e.target;
    if(target.className === 'drag') {
      return;
    }
    if(target.className === 'bar') {
      target = target.parentNode;
    }
    let pageX = e.pageX;
    W = target.clientWidth;
    originX = target.offsetLeft;
    while(target.parentNode) {
      target = target.parentNode;
      originX += target.offsetLeft || 0;
    }
    let percent = (pageX - originX) / W;
    let animateController = root.animateController;
    if(animateController.list.length || animateController.__list2.length) {
      let list = animateController.list.length ? animateController.list : animateController.__list2;
      let time = percent * list[0].options.duration;
      if(time < 0) {
        time = 0;
      }
      else if(time > this.props.preview.total) {
        time = total;
      }
      store.preview.setTime(time);
      animateController.gotoAndStop(time);
    }
  }

  render() {
    let { type, unit, rem, vw, vh, time, total, isPlaying, isBgBlack } = this.props.preview;
    let iterations = this.props.preview.iterations;
    if(iterations === 'Infinity') {
      iterations = 0;
    }
    return <div className={classnames('preview-panel', {
      show: store.global.isPreview,
    })}>
      <div className="btn">
        <div className="return" onClick={() => {
          if(root) {
            root.destroy();
            root = null;
          }
          transaction(() => {
            store.preview.setPlay(false);
            store.preview.setTime(0);
            store.global.setPreview(false);
            img.reset();
          });
        }}>返回</div>
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
      </div>
      <div className="container">
        {/*<div className="menu"/>*/}
        <div className="view">
          <div className="stage"
               ref={el => this.stage = el}>
            <div className={classnames('canvas', {
              mosaic: !isBgBlack,
            })} ref={el => this.canvas = el}/>
          </div>
          <div className="control">
            <div className={classnames('bg', {
              mosaic: !isBgBlack,
            })} onClick={() => this.clickBg(!isBgBlack)}/>
            <div className={classnames('play', {
              show: !isPlaying,
            })} onClick={() => this.clickPlay()}/>
            <div className={classnames('pause', {
              show: isPlaying,
            })} onClick={() => this.clickPause()}/>
            <div className="time">{formatTime(time || 0)}</div>
            <div className="progress" onClick={e => this.clickProgress(e)}>
              <div className="bar" style={{
                width: ((time * 100 / total) || 0) + '%',
              }}/>
              <div className="drag" style={{
                left: ((time * 100 / total) || 0) + '%',
              }} onMouseDown={e => this.mouseDown(e)}/>
            </div>
            <div className="time2">{formatTime(total || 0)}</div>
          </div>
        </div>
        <div className="side">
          <label className="block">
            <input type="checkbox"
                   ref={el => this.format = el}
                   defaultChecked={this.props.preview.format}/>
            <span>JSON格式化</span>
          </label>
          <label className="block">
            <input type="checkbox"
                   ref={el => this.base64 = el}
                   defaultChecked={this.props.preview.base64}/>
            <span>图片base64</span>
          </label>
          <label className="block">
            <span>循环次数(0为无穷)</span>
            <input type="number" min="0"
                   value={iterations || 0}
                   onChange={e => this.changeIterations(e)}/>
          </label>
          <label className="block">
            <span>小数精度(0为整数)</span>
            <input type="number" min="0"
                   value={this.props.preview.precision || 0}
                   onChange={e => this.changePrecision(e)}/>
          </label>
          <p>输出单位</p>
          <label className="inline" onClick={() => this.unit('px')}>
            <input type="radio"
                   name="unit"
                   value="px"
                   checked={unit === 'px'}
                   readOnly={true}/>
            <span>px</span>
          </label>
          <label className="inline" onClick={() => this.unit('rem')}>
            <input type="radio"
                   name="unit"
                   value="rem"
                   checked={unit === 'rem'}
                   readOnly={true}/>
            <span>rem</span>
          </label>
          <label className="inline" onClick={() => this.unit('vw')}>
            <input type="radio"
                   name="unit"
                   value="vw"
                   checked={unit === 'vw'}
                   readOnly={true}/>
            <span>vw</span>
          </label>
          <label className="inline last" onClick={() => this.unit('vh')}>
            <input type="radio"
                   name="unit"
                   value="vh"
                   checked={unit === 'vh'}
                   readOnly={true}/>
            <span>vh</span>
          </label>
          <label className={classnames('block', { hidden: unit !== 'rem' })}>
            <span>Root FontSize</span>
            <input type="number" min="0" className="big"
                   value={rem}
                   onChange={e => this.changeRem(e)}/>
          </label>
          <label className={classnames('block', { hidden: unit !== 'vw' })}>
            <span>Root Width</span>
            <input type="number" min="0" className="big"
                   value={vw}
                   onChange={e => this.changeVw(e)}/>
          </label>
          <label className={classnames('block', { hidden: unit !== 'vh' })}>
            <span>Root Height</span>
            <input type="number" min="0" className="big"
                   value={vh}
                   onChange={e => this.changeVh(e)}/>
          </label>
          <div className="btn">
            <div className="export" onClick={() => {
              let { data, iterations, precision } = this.props.preview;
              let { format, base64 } = this;
              data = JSON.parse(JSON.stringify(data));
              delete data.uuid;
              store.global.setLoading(true);
              output(data, {
                iterations,
                precision,
                unit,
                rem,
                vw,
                vh,
              });
              function cb() {
                let str = format.checked ? JSON.stringify(data, null, 2) : JSON.stringify(data);
                str = str.replace(/'/g, '\\\'');
                str = str.replace(/\n/g, '\\\n');
                csInterface.evalScript(`$.ae2karas.export('${str}')`);
                store.global.setAlert('导出成功！');
                store.global.setLoading(false);
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
              delete data.uuid;
              store.global.setLoading(true);
              output(data, {
                iterations,
                precision,
                unit,
                rem,
                vw,
                vh,
              });
              function cb() {
                let str = format.checked ? JSON.stringify(data, null, 2) : JSON.stringify(data);
                str = str.replace(/'/g, '\\\'');
                let blob = new Blob([str], {
                  type: 'application/json',
                });
                let file = new File([blob], name + Date.now() + '.json', {
                  type: 'application/json',
                });
                let formData = new FormData();
                formData.append(file.name, file);
                formData.append('mode', 'public');
                fetch(config.UPLOAD_JSON, {
                  method: 'POST',
                  body: formData,
                }).then(res => res.json()).then(function(res) {
                  store.global.setLoading(false);
                  if(res.success && res.result) {
                    store.global.setAlert('已上传至：\n' + res.result);
                  }
                  else {
                    store.global.setAlert('上传失败！');
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
