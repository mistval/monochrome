const path = require('path');
const FPersist = require('fpersist');

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
 * @param {Object} data - The current data associated with the key. If there is none, an empty object {} is given. This data can be manipulated and then returned to persist it.
 * @returns {Object} The new data to associate with the key.
 */

/**
 * Read or write persistent data that is persisted even if the process is killed.
 * The persistence is a key-value store backed by [fpersist]{@link https://www.npmjs.com/package/fpersist}.
 * You can store values for any key, but there are convenience methods provided for storing data
 * attached to a particular user or server, or in a global store.
 * Persistence can be accessed via {@link Monochrome#getPersistence}.
 * For examples of using persistence to store and retrieve persistent data, see the
 * [demo addQuote command]{@link https://github.com/mistval/monochrome-demo/blob/master/commands/addquote.js}
 * and [demo getRandomQuote command]{@link https://github.com/mistval/monochrome-demo/blob/master/commands/getrandomquote.js}.
 * @hideconstructor
 */
class Persistence {
  constructor(defaultPrefixes, logger, persistenceDirectory) {
    this.storage = new FPersist(persistenceDirectory || process.cwd());
    this.defaultPrefixes_ = defaultPrefixes;
    this.prefixesForServerId_ = {};
    this.logger = logger.child({
      component: 'Monochrome::Persistence',
    });

    this.getGlobalData().then(data => {
      this.prefixesForServerId_ = data.prefixes || {};
    }).catch(err => {
      this.logger.error({
        event: 'ERROR LOADING PREFIXES',
        err,
      });
    });
  }

  /**
   * Delete the value associated with a specified key.
   * If the key doesn't exist, nothing happens and no error is thrown.
   * @param {string} key
   * @async 
   */
  deleteData(key) {
    return this.storage.deleteItem(key);
  }

  /**
   * Get the value associated with the specified key. If no such value exists,
   * an empty object {} is returned.
   * @param {string} key
   * @returns {Object} The value associated with the specified key.
   * @async
   * @example
const data = await persistence.getData('some_key');
console.log(JSON.stringify(data));
   */
  getData(key) {
    return this.storage.getItem(key, {});
  }

  /**
   * Get the data associated with a user. If no such data exists, an empty
   * object {} is returned.
   * @param {string} userId
   * @returns {Object} The value associated with the specified userId
   * @async
   * @example
const userId = '123456789';
const data = await persistence.getDataForUser(userId);
console.log(JSON.stringify(data));
   */
  getDataForUser(userId) {
    return this.getData(keyForUserId(userId));
  }

  /**
   * Get the data associated with a server. If no such data exists, an empty
   * object {} is returned.
   * @param {string} serverId
   * @returns {Object} The value associated with the specified serverId
   * @async
   * @example
const serverId = '123456789';
const data = await persistence.getDataForServer(serverId);
console.log(JSON.stringify(data));
   */
  getDataForServer(serverId) {
    return this.getData(keyForServerId(serverId));
  }

  /**
   * Get the global data. If no such data exists, an empty
   * object {} is returned.
   * @returns {Object} The global data.
   * @async
   * @example
const data = await persistence.getGlobalData();
console.log(JSON.stringify(data));
   */
  getGlobalData() {
    return this.getData(GLOBAL_DATA_KEY);
  }

  /**
   * Get the command prefixes associated with a server ID. This method is synchronous, in order to avoid the overhead
   * of using promises. If called very soon after the bot starts, it might not return the correct prefixes. It
   * might return the default prefixes even though the server has custom prefixes.
   * @param {string} serverId
   * @returns {string[]}
   * @example
const serverId = '123456789';
const prefixes = persistence.getPrefixesForServer(serverId);
const firstPrefix = prefixes[0];
const numberOfPrefixes = prefixes.length;
   */
  getPrefixesForServer(serverId) {
    return this.prefixesForServerId_[serverId] || this.defaultPrefixes_;
  }

  /**
   * Get the primary prefix for the location where msg was sent. This method is synchronous, in order to avoid the overhead
   * of using promises. If called very soon after the bot starts, it might not return the correct prefixes. It
   * might return the default prefixes even though the server has custom prefixes.
   * @param {external:"Eris.Message"} msg
   * @returns {string}
   */
  getPrimaryPrefixForMessage(msg) {
    return this.getPrefixesForMessage(msg)[0];
  }

  /**
   * Get the prefixes for the location where msg was sent. This method is synchronous, in order to avoid the overhead
   * of using promises. If called very soon after the bot starts, it might not return the correct prefixes. It
   * might return the default prefixes even though the server has custom prefixes.
   * @param {external:"Eris.Message"} msg
   * @returns {string[]}
   */
  getPrefixesForMessage(msg) {
    return this.getPrefixesForServer(msg.channel.guild ? msg.channel.guild.id : msg.channel.id);
  }

  /**
   * Edit the data associated with a key. This function is atomic in the sense
   * that no one else can be editing the value for the same key at the same time.
   * @param {string} key
   * @param {Persistence~editFunction} editFunction - The function that performs the edit.
   * @async
   * @example
await persistence.editData('some_key', (data) => {
  data.randomNumber = Math.random() * 100;

  if (!data.numberOfTimesEdited) {
    data.numberOfTimesEdited = 0;
  }

  data.numberOfTimesEdited += 1;

  return data;
});
   */
  editData(key, editFunction) {
    return this.storage.editItem(key, editFunction, {});
  }

  /**
   * Edit the data associated with a user. This function is atomic in the sense
   * that no one else can be editing the value for the same key at the same time.
   * @param {string} userId
   * @param {Persistence~editFunction} editFunction - The function that performs the edit.
   * @async
   * @example
const userId = '123456789';
await editDataForUser(userId, (data) => {
  data.userIsWorthMyTime = false;
  return data;
});
   */
  editDataForUser(userId, editFunction) {
    let key = keyForUserId(userId);
    return this.editData(key, editFunction);
  }

  /**
   * Edit the data associated with a server. This function is atomic in the sense
   * that no one else can be editing the value for the same key at the same time.
   * @param {string} serverId
   * @param {Persistence~editFunction} editFunction - The function that performs the edit.
   * @async
   * @example
const serverId = '123456789';
await editDataForServer(serverId, (data) => {
  data.favoriteUserInServer = 'nobody';
  return data;
});
   */
  editDataForServer(serverId, editFunction) {
    let key = keyForServerId(serverId);
    return this.editData(key, editFunction);
  }

  /**
   * Edit the data global data. This function is atomic in the sense
   * that no one else can be editing the value for the same key at the same time.
   * @param {Persistence~editFunction} editFunction - The function that performs the edit.
   * @async
   * @example await editGlobalData((data) => {
  if (!data.scoreboard) {
    data.scoreboard = {};
  }

  data.scoreboard['John Wick'] = 100;
  return data;
});
   */
  editGlobalData(editFunction) {
    return this.editData(GLOBAL_DATA_KEY, editFunction);
  }

  /**
   * Edit the prefixes associated with a server.
   * @param {string} serverId
   * @param {string[]} prefixes - The new prefixes for the server.
   * @async
   * @example
const serverId = '123456789';
const newPrefixes = ['!', '@', '&!'];
await editPrefixesForServer(serverId, newPrefixes);
   */
  editPrefixesForServerId(serverId, prefixes) {
    if (!prefixes) {
      delete this.prefixesForServerId_[serverId];
    } else {
      const lowercasePrefixes = prefixes.map(prefix => prefix.toLowerCase());
      const uniqueLowercasePrefixes = lowercasePrefixes.filter((prefix, i) => lowercasePrefixes.indexOf(prefix) === i);
      this.prefixesForServerId_[serverId] = uniqueLowercasePrefixes;
    }

    return this.editData(GLOBAL_DATA_KEY, data => {
      data.prefixes = data.prefixes || {};
      data.prefixes[serverId] = this.prefixesForServerId_[serverId];
      return data;
    });
  }

  /**
   * Reset the prefixes associated with a server.
   * @param {string} serverId
   * @async
   */
  resetPrefixesForServerId(serverId) {
    return this.editPrefixesForServerId(serverId, undefined);
  }

  /**
   * Tell persistence that it should stop allowing write operations.
   * @async
   */
  stop() {
    return this.storage.close();
  }
}

module.exports = Persistence;
