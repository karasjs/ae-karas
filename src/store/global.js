import { makeAutoObservable } from 'mobx';

class Global {
  isLoading = false;
  isPreview = false;
  alert = '';
  isResize = false;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(b) {
    this.isLoading = b;
  }

  setPreview(b) {
    this.isPreview = b;
  }

  setAlert(b) {
    this.alert = b;
  }

  setResize(b) {
    this.isResize = b;
  }
}

export default new Global();
