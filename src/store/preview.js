import { makeAutoObservable } from 'mobx';

class Preview {
  data = null;
  type = 'canvas';
  unit = 'px';
  rem = 16;
  vw = 750;
  vh = 1334;
  format = false;
  base64 = false;
  autoSize = true;
  autoOverflow = true;
  cropBlank = true;
  iterations = 1;
  precision = 0;
  time = 0;
  total = 0;
  isPlaying = false;
  isBgBlack = false;
  img = null;

  constructor() {
    makeAutoObservable(this);
  }

  setData(data) {
    this.data = data;
  }

  setType(type) {
    this.type = type;
  }

  setUnit(unit) {
    this.unit = unit;
  }

  setFormat(format) {
    this.format = format;
  }

  setBase64(base64) {
    this.base64 = base64;
  }

  setAutoSize(autoSize) {
    this.autoSize = autoSize;
  }

  setAutoOverflow(autoOverflow) {
    this.autoOverflow = autoOverflow;
  }

  setCropBlank(cropBlank) {
    this.cropBlank = cropBlank;
  }

  setFontSize(fontSize) {
    this.fontSize = fontSize;
  }

  setRem(rem) {
    this.rem = rem;
  }

  setVw(vw) {
    this.vw = vw;
  }

  setVh(vh) {
    this.vh = vh;
  }

  setIterations(iterations) {
    this.iterations = iterations;
  }

  setPrecision(precision) {
    this.precision = precision;
  }

  setTime(time) {
    this.time = time;
  }

  setTotal(total) {
    this.total = total;
  }

  setPlay(isPlaying) {
    this.isPlaying = isPlaying;
  }

  setBgBlack(isBgBlack) {
    this.isBgBlack = isBgBlack;
  }

  setImg(img) {
    this.img = img;
  }
}

export default new Preview();
