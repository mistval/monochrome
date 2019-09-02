const { MongoClient } = require('mongodb');

class Plugin {
  constructor(dbUri, dbName) {
    this.client = new MongoClient(dbUri);
    this.dbName = dbName;
  }

  async connect() {
    await this.client.connect();
    if (!this.db) {
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection('monochrome');
      this.collection.createIndex({ key: 1 }, { unique: true });
    }
  }

  async getValue(key, defaultValue) {
    await this.connect();

    const result = await this.collection.findOne({ key });
    return result === null ? defaultValue : result.value;
  }

  async editValue(key, editFn) {
    await this.connect();

    const valueWrapper = await this.collection.findOne({ key });
    const value = valueWrapper ? valueWrapper.value : undefined;
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
    await this.db.dropDatabase();
  }
}

module.exports = Plugin;
