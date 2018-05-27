const assert = require('assert');
const Storage = require('node-persist');
const Persistence = require('./../core/persistence.js');
const MockConfig = require('./mock_objects/mock_config.js');

const config = new MockConfig('Server Admin', ['bot-admin-id']);
const persistence = new Persistence({dir: './test/persistence'}, config);

Storage.clearSync();

function createNextEdit(index) {
  persistence.editGlobalData(data => {
    if (index < 100) {
      createNextEdit(index + 1);
    }

    data[index.toString()] = index;
    return data;
  });
}

describe('Persistence', function() {
  it('Does not allow edits to collide', function(done) {
    createNextEdit(0);
    setTimeout(() => {
      return persistence.getGlobalData().then(data => {
        for (let i = 0; i < 100; ++i) {
          if (data[i.toString()] !== i) {
            done('data does not match expectations at position ' + i.toString());
          }
        }
        done();
      });
    }, 200);
  });
  describe('editDataForUser() and getDataForUser()', function() {
    const userId = 'userid1';
    const userName = 'username1';
    it('Stores the data without error', function() {
      return persistence.editDataForUser(userId, (data) => {
        data.name = userName;
        return data;
      });
    });
    it('Reads the correct data back', function() {
      return persistence.getDataForUser(userId).then(data => {
        if (data.name === userName) {
          return true;
        } else {
          throw new Error('Wrong user name in data ' + JSON.stringify(data));
        }
      });
    });
  });
  describe('editDataForServer() and getDataForServer()', function() {
    const serverId = 'server1';
    const serverName = 'data1';
    it('Stores the data without error', function() {
      return persistence.editDataForServer(serverId, (data) => {
        data.name = serverName;
        return data;
      });
    });
    it('Reads the correct data back', function() {
      return persistence.getDataForServer(serverId).then(data => {
        if (data.name === serverName) {
          return true;
        } else {
          throw new Error('Wrong user name in data ' + JSON.stringify(data));
        }
      });
    });
  });
  describe('editGlobalData() and setGlobalData()', function() {
    const globalData = 'globalData';
    it('Stores the data without error', function() {
      return persistence.editGlobalData((data) => {
        data.data = globalData;
        return data;
      });
    });
    it('Reads the correct data back', function() {
      return persistence.getGlobalData().then(data => {
        if (data.data === globalData) {
          return true;
        } else {
          throw new Error('Wrong user name in data ' + JSON.stringify(data));
        }
      });
    });
  });
  describe('Prefixes', function() {
    const serverId = 'server1';
    it('Returns prefixes in config if they haven\'t been customized', function() {
      const prefixes = persistence.getPrefixesForServerId(serverId);
      assert(JSON.stringify(prefixes) === JSON.stringify(config.prefixes));
    });
    it('Returns customiz prefixes if they exist', async function() {
      const customPrefixes = ['a'];
      await persistence.editPrefixesForServerId(serverId, customPrefixes);
      const prefixes = persistence.getPrefixesForServerId(serverId);
      assert(JSON.stringify(prefixes) === JSON.stringify(customPrefixes));
    });
  });
});
