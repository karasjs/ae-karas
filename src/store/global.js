import { makeAutoObservable } from 'mobx';

class Global {

  constructor() {
    makeAutoObservable(this);
  }
}

export default new Global();
