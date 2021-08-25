import { makeAutoObservable } from 'mobx';

class Preview {
  isShow = false;
  id = null;

  constructor() {
    makeAutoObservable(this);
  }

  setShow(isShow) {
    this.isShow = isShow;
  }

  setId(id) {
    this.id = id;
  }
}

export default new Preview();
