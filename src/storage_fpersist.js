const FPersist = require('fpersist');

/**
 * A storage plugin backed by {@link https://www.npmjs.com/package/fpersist fpersist}.
 * Offers safe, light key-value JSON persistence.
 * Not appropriate for multi-process sharded bots.
 * This plugin is built into Monochrome.
 * @implements StoragePlugin
 */
class FPersistStoragePlugin {
  /**
   * @param {String} persistenceDir - A full path to the directory to store persistence files.
   *   The directory doesn't have to exist, but its parents do. Don't put anything else in the
   *   persistence directory. It should be used exclusively by fpersist.
   * @example
const FPersistPlugin = require('monochome-bot').Plugins.FPersist;
const storage = new FPersistPlugin(path.join(__dirname, 'storage'));
   */
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

  clear() {
    return this.storage.clear();
  }
}

module.exports = FPersistStoragePlugin;
