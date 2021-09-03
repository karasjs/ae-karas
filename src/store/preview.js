import { makeAutoObservable } from 'mobx';

class Preview {
  data = null;

  constructor() {
    makeAutoObservable(this);
  }

  setData(data) {
    this.data = data;
  }
}

export default new Preview();
