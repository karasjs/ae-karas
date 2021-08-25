import { makeAutoObservable } from 'mobx';

class Composition {
  list = [];
  currentId = null;

  constructor() {
    makeAutoObservable(this);
  }

  update(list) {
    this.list = list;
  }

  setCurrent(id) {
    this.currentId = id;
  }
}

export default new Composition();
