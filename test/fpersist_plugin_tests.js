const { assert } = require('chai');
const path = require('path');
const FPersistPlugin = require('../src/storage_fpersist.js');

const PERSISTENCE_DIR = path.join(__dirname, 'persistence');
let plugin;

describe('FPersist storage plugin', function() {
  this.beforeEach(function() {
    plugin = new FPersistPlugin(PERSISTENCE_DIR);
  });

  afterEach(async function() {
    await plugin.clear();
    await plugin.close();
  });

  it('Gives me back what I give it', async function() {
    await plugin.editValue('testKey', () => 5);
    assert.equal(5, await plugin.getValue('testKey'));
  });
  it('Gives me the default value if key does not exist', async function() {
    assert.equal(10, await plugin.getValue('testKey', 10));
  });
  it('Gives me the existing value, not the default, if a value exists', async function() {
    await plugin.editValue('testKey', () => 15);
    assert.equal(15, await plugin.getValue('testKey', 'f'));
  });
  it('Returns undefined by default if key is not present', async function() {
    assert.isUndefined(await plugin.getValue('testKey2'));
  });
  it('Deletes values successfully', async function() {
    await plugin.editValue('testKey2', () => 'test');
    await plugin.deleteKey('testKey2');
    assert.isUndefined(await plugin.getValue('testKey2'));
  });
  it('Clears the database successfully', async function() {
    await plugin.editValue('testKey3', () => 'test');
    await plugin.clear();
    assert.isUndefined(await plugin.getValue('testKey3'));
  });
});
