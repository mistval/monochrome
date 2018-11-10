const storage = require('node-persist');

let storageInit;
const editLockForKey = {};

class EditLock {
  constructor(key) {
    this.key_ = key;
    this.queue_ = [];
    this.editing_ = false;
    this.stopped_ = false;
  }

  stop() {
    this.stopped_ = true;
    this.queue_ = [];
    return new Promise((fulfill, reject) => {
      this.editFinished_ = fulfill;
    });
  }

  edit(editFunction) {
    if (this.stopped_) {
      throw new Error('Persistence has been stopped. No new edit jobs can be accepted.');
    }
    return new Promise((fulfill, reject) => {
      this.queue_.push({editFunction: editFunction, fulfill: fulfill, reject: reject});
      this.tryEditNext_();
    });
  }

  tryEditNext_() {
    if (!this.editing_ && this.queue_.length > 0) {
      this.editing_ = true;
      let nextEdit = this.queue_.pop();
      // Get the data from the database
      storage.getItem(this.key_).then(data => {
        // Callback to the edit function to edit it
        return Promise.resolve(nextEdit.editFunction(data)).then(newData => {
          // Put the edited data back into the database
          return storage.setItem(this.key_, newData).then(() => {
            // Release the lock, fulfill, and move on to the next edit if it exists
            this.finishEdit(nextEdit);
            nextEdit.fulfill(newData);
          }).catch(err => {
            nextEdit.reject(err);
            this.finishEdit(nextEdit);
          });
        }).catch(err => {
          nextEdit.reject(err);
          this.finishEdit(nextEdit);
        });
      }).catch(err => {
        nextEdit.reject(err);
        this.finishEdit(nextEdit);
      });
    }
  }

  finishEdit(edit) {
    if (this.queue_.length === 0) {
      delete editLockForKey[this.key_];
    }

    if (this.editFinished_) {
      this.editFinished_();
    }

    this.editing_ = false;
    this.tryEditNext_();
  }
}

function getOrCreateEditLockForKey(key) {
  if (!editLockForKey[key]) {
    editLockForKey[key] = new EditLock(key);
  }

  return editLockForKey[key];
}

function checkInit() {
  if (!storageInit) {
    throw new Error('Storage has not been initialized. Call init() before trying to access storage.');
  }
}

function init(options) {
  if (!storageInit) {
    storageInit = storage.init(options);
  }
};

async function editItem(itemKey, editFunction) {
  checkInit();
  await storageInit;
  return getOrCreateEditLockForKey(itemKey).edit(editFunction);
};

async function getItem(itemKey) {
  checkInit();
  await storageInit;
  return storage.getItem(itemKey);
};

function stop() {
  return Promise.all(Object.values(editLockForKey).map(editLock => editLock.stop()));
}

module.exports = {
  init,
  editItem,
  getItem,
  stop,
};
