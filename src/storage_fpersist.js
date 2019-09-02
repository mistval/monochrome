const FPersist = require('fpersist');

class Plugin {
  constructor(persistenceDir) {
    this.storage = new FPersist(persistenceDir);
  }

  getValue(key, defaultValue) {
    return this.storage.getItem(key, defaultValue);
  }

  editValue(key, editFn, defaultValue) {
    return this.storage.editItem(key, editFn, defaultValue);
  }

  deleteKey(key) {
    return this.storage.deleteItem(key);
  }

  close() {
    return this.storage.close();
  }
}

module.exports = Plugin;
