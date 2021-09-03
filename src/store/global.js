import { makeAutoObservable } from 'mobx';

class Global {
  isLoading = false;
  isPreview = false;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(b) {
    this.isLoading = b;
  }

  setPreview(b) {
    this.isPreview = b;
  }
}

export default new Global();
