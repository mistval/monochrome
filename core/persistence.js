'use strict'
const storage = require('./util/node_persist_atomic.js');
const state = require('./util/misc_unreloadable_data.js');

const USER_DATA_KEY_PREFIX = 'User';
const SERVER_DATA_KEY_PREFIX = 'Server';
const GLOBAL_DATA_KEY = 'Global';

function keyForUserId(userId) {
  return USER_DATA_KEY_PREFIX + userId;
}

function keyForServerId(serverId) {
  return SERVER_DATA_KEY_PREFIX + serverId;
}

/**
* A utility to help with persisting data. Singleton.
*/
class Persistence {
  constructor(defaultPrefixes, nodePersistOptions) {
    storage.init(nodePersistOptions);
    this.defaultPrefixes_ = defaultPrefixes;

    if (!state.persistence) {
      state.persistence = {
        prefixesForServerId: {},
      };

      this.getGlobalData().then(data => {
        state.persistence.prefixesForServerId = data.prefixes || {};
      });
    }
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

  /**
  * Get data associated with a userId
  * @param {String} userId - The id of the user to get data associated with.
  * @returns {Promise} a promise that will be fulfilled with the user data object.
  */
  getDataForUser(userId) {
    return this.getData(keyForUserId(userId));
  }

  /**
  * Get data associated with a serverId
  * @param {String} serverId - The id of the server to get data associated with.
  * @returns {Promise} a promise that will be fulfilled with the server data object.
  */
  getDataForServer(serverId) {
    return this.getData(keyForServerId(serverId));
  }

  /**
  * Get global data
  * @returns {Promise} a promise that will be fulfilled with the global data object.
  */
  getGlobalData() {
    return this.getData(GLOBAL_DATA_KEY);
  }

  /**
  * Get the prefixes for the given server ID. For performance reasons, this does not
  * return a promise. If it is called before the server prefixes have a chance to load, the
  * default prefixes will be returned.
  * @param {String} serverId - The id of the server to get prefixes for.
  * @returns {Array<String>} An array of prefixes.
  */
  getPrefixesForServerId(serverId) {
    return state.persistence.prefixesForServerId[serverId] || this.defaultPrefixes_;
  }

  /**
  * Get the first prefix for the location where a message is sent.
  * @param {Eris.Message} msg - The message.
  * @returns {String} The primary prefix.
  */
  getPrimaryPrefixFromMsg(msg) {
    const locationId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
    return this.getPrefixesForServerId(locationId)[0];
  }

  /**
  * Convenience method to get get prefixes based on a message instead of server ID.
  * @param {Message} msg - A message sent on the server you want to get the prefixes for.
  * @returns {Array<String>} An array of prefixes.
  */
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

  /**
  * Edit data associated with a userId
  * @param {String} userId - The id of the user to set data associated with.
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editDataForUser(userId, editDataFunction) {
    let key = keyForUserId(userId);
    return this.editData(key, editDataFunction);
  }

  /**
  * Edit data associated with a userId
  * @param {String} serverId - The id of the server to set data associated with.
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editDataForServer(serverId, editDataFunction) {
    let key = keyForServerId(serverId);
    return this.editData(key, editDataFunction);
  }

  /**
  * Edit global data
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editGlobalData(editDataFunction) {
    return this.editData(GLOBAL_DATA_KEY, editDataFunction);
  }

  /**
  * Edit the prefixes for a server
  * @param {String} serverId - The id of the server to get prefixes for.
  * @param {Array<String>} prefixes - The new prefixes.
  * @returns {Promise} a promise that will be fulfilled when the prefixes have been edited.
  */
  editPrefixesForServerId(serverId, prefixes) {
    state.persistence.prefixesForServerId[serverId] = prefixes;
    return this.editData(GLOBAL_DATA_KEY, data => {
      data.prefixes = data.prefixes || {};
      data.prefixes[serverId] = prefixes;
      return data;
    });
  }

  resetPrefixesForServerId(serverId) {
    delete state.persistence.prefixesForServerId[serverId];
    return this.editData(GLOBAL_DATA_KEY, data => {
      data.prefixes = data.prefixes || {};
      delete data.prefixes[serverId];
      return data;
    });
  }
}

module.exports = Persistence;
