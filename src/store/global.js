import { makeAutoObservable } from 'mobx';

class Global {
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(b) {
    this.isLoading = b;
  }
}

export default new Global();
