const { MongoClient } = require('mongodb');

/**
 * A storage plugin backed by MongoDB.
 * @implements StoragePlugin
 */
class MongoDBStoragePlugin {
  /**
   * Instantiate a plugin.
   * @param {String} dbUri - A MongoDB connection URI, such as <code>mongodb://localhost</code>.
   * @param {String} [dbName] - The name of the database to use or create,
   *   such as <code>monochromepersistence</code> (the default).
   * @param {String} [collectionName] - The name of the collection to use or create,
   *   such as <code>monochromepersistence</code> (the default).
   */
  constructor(dbUri, dbName, collectionName) {
    this.client = new MongoClient(dbUri, { useUnifiedTopology: true });
    this.dbName = dbName || 'monochromepersistence';
    this.collectionName = collectionName || 'monochromepersistence';
  }

  async connect() {
    await this.client.connect();

    if (!this.db) {
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);
      await this.collection.createIndex({ key: 1 }, { unique: true });
    }
  }

  async getValue(key, defaultValue) {
    await this.connect();

    const result = await this.collection.findOne({ key });
    return result === null ? defaultValue : result.value;
  }

  async editValue(key, editFn, defaultValue = undefined) {
    await this.connect();

    const valueWrapper = await this.collection.findOne({ key });
    const value = valueWrapper ? valueWrapper.value : defaultValue;
    const updatedValue = await editFn(value);

    await this.collection.updateOne(
      { key },
      { $set: { value: updatedValue } },
      { upsert: true },
    );

    return updatedValue;
  }

  async deleteKey(key) {
    await this.connect();
    await this.collection.deleteOne({ key });
  }

  async close() {
    await this.connect();
    await this.client.close();
  }

  async clear() {
    await this.connect();
    await this.collection.deleteMany({});
  }
}

module.exports = MongoDBStoragePlugin;
