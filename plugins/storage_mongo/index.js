const { MongoClient } = require('mongodb');

class Plugin {
  constructor(dbUri, dbName) {
    this.client = new MongoClient(dbUri);
    this.dbName = dbName;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.collection = this.db.collection('monochrome');
    this.collection.createIndex({ key: 1 }, { unique: true });
  }

  async getValue(key, defaultValue) {
    if (!this.client.isConnected) {
      await this.connect();
    }

    const result = await this.collection.findOne({ key });
    return result === undefined ? defaultValue : result.value;
  }

  async editValue(key, editFn) {
    if (!this.client.isConnected) {
      await this.connect();
    }

    const valueWrapper = await this.collection.findOne({ key });
    const value = valueWrapper ? valueWrapper.value : undefined;
    const updatedValue = await editFn(value);
    await this.collection.updateOne(
      { key },
      { value: updatedValue },
      { upsert: true },
    );

    return updatedValue;
  }

  async deleteKey(key) {
    if (!this.client.isConnected) {
      await this.connect();
    }

    await this.collection.deleteOne({ key });
  }

  async close() {
    await this.client.close();
  }
}

module.exports = Plugin;
