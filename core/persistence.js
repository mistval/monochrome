const storage = require('./util/node_persist_atomic.js');

const USER_DATA_KEY_PREFIX = 'User';
const SERVER_DATA_KEY_PREFIX = 'Server';
const GLOBAL_DATA_KEY = 'Global';

function keyForUserId(userId) {
  return USER_DATA_KEY_PREFIX + userId;
}

function keyForServerId(serverId) {
  return SERVER_DATA_KEY_PREFIX + serverId;
}

class Persistence {
  constructor(defaultPrefixes, logger, nodePersistOptions) {
    storage.init(nodePersistOptions);
    this.defaultPrefixes_ = defaultPrefixes;
    this.prefixesForServerId_ = {};

    this.getGlobalData().then(data => {
      this.prefixesForServerId_ = data.prefixes || {};
    }).catch(err => {
      logger.logFailure('PERSISTENCE', 'Error loading prefixes', err);
    });
  }

  getData(key) {
    return storage.getItem(key).then(data => {
      if (data) {
        return data;
      } else {
        return {};
      }
    });
  }

  getDataForUser(userId) {
    return this.getData(keyForUserId(userId));
  }

  getDataForServer(serverId) {
    return this.getData(keyForServerId(serverId));
  }

  getGlobalData() {
    return this.getData(GLOBAL_DATA_KEY);
  }

  getPrefixesForServerId(serverId) {
    return this.prefixesForServerId_[serverId] || this.defaultPrefixes_;
  }

  getPrimaryPrefixFromMsg(msg) {
    const locationId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
    return this.getPrefixesForServerId(locationId)[0];
  }

  getPrefixesForMessage(msg) {
    return this.getPrefixesForServerId(msg.channel.guild ? msg.channel.guild.id : msg.channel.id);
  }

  editData(key, editFunction) {
    return storage.editItem(key, data => {
      if (!data) {
        data = {};
      }

      const result = editFunction(data);

      if (result === undefined) {
        throw new Error('Cannot set data to undefined. Use a different value, like false, to signify no value.');
      }

      return result;
    });
  }

  editDataForUser(userId, editDataFunction) {
    let key = keyForUserId(userId);
    return this.editData(key, editDataFunction);
  }

  editDataForServer(serverId, editDataFunction) {
    let key = keyForServerId(serverId);
    return this.editData(key, editDataFunction);
  }

  editGlobalData(editDataFunction) {
    return this.editData(GLOBAL_DATA_KEY, editDataFunction);
  }

  editPrefixesForServerId(serverId, prefixes) {
    this.prefixesForServerId_[serverId] = prefixes;
    return this.editData(GLOBAL_DATA_KEY, data => {
      data.prefixes = data.prefixes || {};
      data.prefixes[serverId] = prefixes;
      return data;
    });
  }

  resetPrefixesForServerId(serverId) {
    delete this.prefixesForServerId_[serverId];
    return this.editData(GLOBAL_DATA_KEY, data => {
      data.prefixes = data.prefixes || {};
      delete data.prefixes[serverId];
      return data;
    });
  }
}

module.exports = Persistence;
