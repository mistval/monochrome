const { assert } = require('chai');
const path = require('path');
const MongoPlugin = require('../plugins/storage_mongo');

let plugin;

describe('Mongo storage plugin', function() {
  this.beforeEach(function() {
    plugin = new MongoPlugin('mongodb://localhost', 'monochrome_persistence_test');
  });

  afterEach(async function() {
    this.timeout(15000);
    await plugin.clear();
    await plugin.close();
  });

  it('Gives me back what I give it', async function() {
    await plugin.editValue('testKey', () => 5);
    assert.equal(5, await plugin.getValue('testKey'));
  }).timeout(15000);
  it('Gives me the default value if key does not exist', async function() {
    assert.equal(10, await plugin.getValue('testKey', 10));
  }).timeout(15000);
  it('Gives me the existing value, not the default, if a value exists', async function() {
    await plugin.editValue('testKey', () => 15);
    assert.equal(15, await plugin.getValue('testKey', 'f'));
  }).timeout(15000);
  it('Returns undefined by default if key is not present', async function() {
    assert.isUndefined(await plugin.getValue('testKey2'));
  }).timeout(15000);
  it('Deletes values successfully', async function() {
    await plugin.editValue('testKey2', () => 'test');
    await plugin.deleteKey('testKey2');
    assert.isUndefined(await plugin.getValue('testKey2'));
  }).timeout(15000);
  it('Provides a given default value to my edit function', async function() {
    await plugin.editValue('testKey', (v) => assert.strictEqual(v, 15), 15);
  });
  it('Clears the database successfully', async function() {
    await plugin.editValue('testKey3', () => 'test');
    await plugin.clear();
    assert.isUndefined(await plugin.getValue('testKey3'));
  }).timeout(15000);
});
