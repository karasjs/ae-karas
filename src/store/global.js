import { makeAutoObservable } from 'mobx';

class Global {
  isLoading = false;
  isPreview = false;
  alert = '';

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
}

export default new Global();
