const assert = require('assert');
const Storage = require('node-persist');
const Persistence = require('./../core/persistence.js');
const MockConfig = require('./mock_objects/mock_config.js');
const path = require('path');

const config = new MockConfig('Server Admin', ['bot-admin-id']);
const persistence = new Persistence([''], undefined, path.join(__dirname, 'persistence'));

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
            return done('data does not match expectations at position ' + i.toString());
          }
        }
        done();
      });
    }, 200);
  });
  it('Refuses to allow setting to undefined', function(done) {
    persistence.editData('Global', () => {
      return undefined;
    }).then(() => {
      done('Should have thrown');
    }).catch(() => {
      done();
    });
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
    const otherServerId = 'server2';
    it('Returns prefixes in config if they haven\'t been customized', function() {
      const prefixes = persistence.getPrefixesForServer(serverId);
      assert(JSON.stringify(prefixes) === JSON.stringify(['']));
    });
    it('Returns custom prefixes if they exist', async function() {
      const customPrefixes = ['a'];
      await persistence.editPrefixesForServerId(serverId, customPrefixes);
      const prefixes = persistence.getPrefixesForServer(serverId);
      assert(JSON.stringify(prefixes) === JSON.stringify(customPrefixes));
    });
    it('Resets given server\'s prefixes without resetting others', async function() {
      const customPrefixes = ['a'];

      await persistence.editPrefixesForServerId(serverId, customPrefixes);
      await persistence.editPrefixesForServerId(otherServerId, customPrefixes);

      let prefixes1 = persistence.getPrefixesForServer(serverId);
      assert(JSON.stringify(prefixes1) === JSON.stringify(customPrefixes));

      let prefixes2 = persistence.getPrefixesForServer(otherServerId);
      assert(JSON.stringify(prefixes2) === JSON.stringify(customPrefixes));

      await persistence.resetPrefixesForServerId(serverId);

      prefixes1 = persistence.getPrefixesForServer(serverId);
      assert(JSON.stringify(prefixes1) === JSON.stringify(['']));

      prefixes2 = persistence.getPrefixesForServer(otherServerId);
      assert(JSON.stringify(prefixes2) === JSON.stringify(customPrefixes));
    });
  });
});
