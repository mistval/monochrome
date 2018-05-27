'use strict'
const reload = require('require-reload')(require);
const storage = reload('./util/node_persist_atomic.js');
const state = require('./util/misc_unreloadable_data.js');

const USER_DATA_KEY_PREFIX = 'User';
const SERVER_DATA_KEY_PREFIX = 'Server';
const GLOBAL_DATA_KEY = 'Global';

function getData(key) {
  return storage.getItem(key).then(data => {
    if (data) {
      return data;
    } else {
      return {};
    }
  });
}

function editData(key, editFunction) {
  return storage.editItem(key, data => {
    if (!data) {
      data = {};
    }
    return editFunction(data);
  });
}

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
  constructor(options, config) {
    storage.init(options);
    this.defaultPrefixes_ = config.prefixes || [];

    if (!state.persistence) {
      state.persistence = {
        prefixesForServerId: {},
      };

      this.getGlobalData().then(data => {
        prefixesForServerId = data.persistence.prefixes;
      });
    }
  }

  /**
  * Get data associated with a userId
  * @param {String} userId - The id of the user to get data associated with.
  * @returns {Promise} a promise that will be fulfilled with the user data object.
  */
  getDataForUser(userId) {
    return getData(keyForUserId(userId));
  }

  /**
  * Get data associated with a serverId
  * @param {String} serverId - The id of the server to get data associated with.
  * @returns {Promise} a promise that will be fulfilled with the server data object.
  */
  getDataForServer(serverId) {
    return getData(keyForServerId(serverId));
  }

  /**
  * Get global data
  * @returns {Promise} a promise that will be fulfilled with the global data object.
  */
  getGlobalData() {
    return getData(GLOBAL_DATA_KEY);
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
  * Edit data associated with a userId
  * @param {String} userId - The id of the user to set data associated with.
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editDataForUser(userId, editDataFunction) {
    let key = keyForUserId(userId);
    return editData(key, editDataFunction);
  }

  /**
  * Edit data associated with a userId
  * @param {String} serverId - The id of the server to set data associated with.
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editDataForServer(serverId, editDataFunction) {
    let key = keyForServerId(serverId);
    return editData(key, editDataFunction);
  }

  /**
  * Edit global data
  * @param {function(data)} editFunction - The callback to perform the edit on the data. It should return the edited data.
  * @returns {Promise} a promise that will be fulfilled when the data has been edited.
  */
  editGlobalData(editDataFunction) {
    return editData(GLOBAL_DATA_KEY, editDataFunction);
  }

  /**
  * Edit the prefixes for a server
  * @param {String} serverId - The id of the server to get prefixes for.
  * @param {Array<String>} prefixes - The new prefixes.
  * @returns {Promise} a promise that will be fulfilled when the prefixes have been edited.
  */
  editPrefixesForServerId(serverId, prefixes) {
    state.persistence.prefixesForServerId[serverId] = prefixes;
    return editData(GLOBAL_DATA_KEY, data => {
      data.prefixes = data.prefixes || {};
      data.prefixes[serverId] = prefixes;
      return data;
    });
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
}

module.exports = Persistence;
