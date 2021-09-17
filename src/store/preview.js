import { makeAutoObservable } from 'mobx';

class Preview {
  data = null;
  type = 'canvas';
  format = false;
  base64 = false;
  iterations = 1;
  precision = 0;

  constructor() {
    makeAutoObservable(this);
  }

  setData(data) {
    this.data = data;
  }

  setType(type) {
    this.type = type;
  }

  setFormat(format) {
    this.format = format;
  }

  setBase64(base64) {
    this.base64 = base64;
  }

  setIterations(iterations) {
    this.iterations = iterations;
  }

  setPrecision(precision) {
    this.precision = precision;
  }
}

export default new Preview();
