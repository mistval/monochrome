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

/**
 * @callback Persistence~editFunction
 * @param {Object} data - The current data associated with the key.
 * @returns {Object} The new data to associate with the key.
 */

/**
 * Read or write persistent data that is persisted even if the process is killed.
 * The persistence is a key-value store backed by [node-persist]{@link https://www.npmjs.com/package/node-persist}.
 * You can store values for any key, but there are convenience methods provided for storing data
 * attached to a particular user or server, or in a global store.
 * @hideconstructor
 */
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

  /**
   * Get the value associated with the specified key. If no such value exists,
   * an empty object {} is returned.
   * @param {string} key
   * @returns {Object} The value associated with the specified key.
   */
  async getData(key) {
    const data = await storage.getItem(key);
    if (data) {
      return data;
    } else {
      return {};
    }
  }

  /**
   * Get the data associated with a user. If no such data exists, an empty
   * object {} is returned.
   * @param {string} userId
   * @returns {Object} The value associated with the specified userId
   */
  async getDataForUser(userId) {
    return this.getData(keyForUserId(userId));
  }

  /**
   * Get the data associated with a server. If no such data exists, an empty
   * object {} is returned.
   * @param {string} serverId
   * @returns {Object} The value associated with the specified serverId
   */
  async getDataForServer(serverId) {
    return this.getData(keyForServerId(serverId));
  }

  /**
   * Get the global data. If no such data exists, an empty
   * object {} is returned.
   * @returns {Object} The global data.
   */
  async getGlobalData() {
    return this.getData(GLOBAL_DATA_KEY);
  }

  /**
   * Get the command prefixes associated with a server ID. This method is synchronous, in order to avoid the overhead
   * of using promises. If called very soon after the bot starts, it might not return the correct prefixes. It
   * might return the default prefixes even though the server has custom prefixes.
   * @param {string} serverId
   * @returns {string[]}
   */
  getPrefixesForServerId(serverId) {
    return this.prefixesForServerId_[serverId] || this.defaultPrefixes_;
  }

  /**
   * Get the primary prefix for the location where msg was sent. This method is synchronous, in order to avoid the overhead
   * of using promises. If called very soon after the bot starts, it might not return the correct prefixes. It
   * might return the default prefixes even though the server has custom prefixes.
   * @param {Eris.Message} msg
   * @returns {string}
   */
  getPrimaryPrefixForMsg(msg) {
    const locationId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
    return this.getPrefixesForServerId(locationId)[0];
  }

  /**
   * Get the prefixes for the location where msg was sent. This method is synchronous, in order to avoid the overhead
   * of using promises. If called very soon after the bot starts, it might not return the correct prefixes. It
   * might return the default prefixes even though the server has custom prefixes.
   * @param {Eris.Message} msg
   * @returns {string[]}
   */
  getPrefixesForMessage(msg) {
    return this.getPrefixesForServerId(msg.channel.guild ? msg.channel.guild.id : msg.channel.id);
  }

  /**
   * Edit the data associated with a key. This function is atomic in the sense
   * that no one else can be editing the value for the same key at the same time.
   * @param {string} key
   * @param {Persistence~editFunction} editFunction - The function that performs the edit.
   */
  async editData(key, editFunction) {
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
   * Edit the data associated with a user. This function is atomic in the sense
   * that no one else can be editing the value for the same key at the same time.
   * @param {string} userId
   * @param {Persistence~editFunction} editFunction - The function that performs the edit.
   */
  async editDataForUser(userId, editFunction) {
    let key = keyForUserId(userId);
    return this.editData(key, editFunction);
  }

  /**
   * Edit the data associated with a server. This function is atomic in the sense
   * that no one else can be editing the value for the same key at the same time.
   * @param {string} serverId
   * @param {Persistence~editFunction} editFunction - The function that performs the edit.
   */
  async editDataForServer(serverId, editFunction) {
    let key = keyForServerId(serverId);
    return this.editData(key, editFunction);
  }

  /**
   * Edit the data global data. This function is atomic in the sense
   * that no one else can be editing the value for the same key at the same time.
   * @param {Persistence~editFunction} editFunction - The function that performs the edit.
   */
  async editGlobalData(editFunction) {
    return this.editData(GLOBAL_DATA_KEY, editFunction);
  }

  /**
   * Edit the prefixes associated with a server.
   * @param {string} serverId
   * @param {string[]} prefixes - The new prefixes for the server.
   */
  async editPrefixesForServerId(serverId, prefixes) {
    if (!prefixes) {
      delete this.prefixesForServerId_[serverId];
    } else {
      this.prefixesForServerId_[serverId] = prefixes;
    }

    return this.editData(GLOBAL_DATA_KEY, data => {
      data.prefixes = data.prefixes || {};
      data.prefixes[serverId] = prefixes;
      return data;
    });
  }

  /**
   * Reset the prefixes associated with a server.
   * @param {string} serverId
   */
  async resetPrefixesForServerId(serverId) {
    return this.editPrefixesForServerId(serverId, undefined);
  }
}

module.exports = Persistence;
