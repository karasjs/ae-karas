import { makeAutoObservable } from 'mobx';

class Preview {
  data = null;
  type = 'canvas';

  constructor() {
    makeAutoObservable(this);
  }

  setData(data) {
    this.data = data;
  }

  setType(type) {
    this.type = type;
  }
}

export default new Preview();
