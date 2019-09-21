/**
 * A plugin that provides read/write access to persistent storage.
 * This is an interface. It is implemented by {@link FPersistStoragePlugin}
 * and {@link MongoDBStoragePlugin}. You can use one of those or create
 * your own plugin that implements this interface.
 * 
 * @interface
 */
function StoragePlugin() { }

/**
 * Get the value associated with the given key.
 * @param {String} key - The key.
 * @param {*} [defaultValue=undefined] - The default value if no value is present for that key.
 * @returns {*} The value present in storage,
 *   or the default value if no value is present in storage.
 * @async
 */
StoragePlugin.prototype.getValue = async function(key, defaultValue) { }

/**
 * Update the value associated with the given key.
 * @param {String} key - The key.
 * @param {function} editFn - A (async or sync) function that takes one argument (the current value
 *   retrieved from storage for the given key) and returns the updated value.
 * @param {*} [defaultValue=undefined] - The default value to pass into the editFn
 *   if no value is present for that key.
 * @returns {*} The updated value.
 * @async
 */
StoragePlugin.prototype.editValue = async function(key, editFn, defaultValue) { }

/**
 * Delete the value associated with the given key, clearing it from persistence.
 * If the key already wasn't present, this won't throw.
 * @param {String} key - The key.
 * @async
 */
StoragePlugin.prototype.deleteKey = async function(key) { }

/**
 * Finish all operations and close down. Reads and writes
 * may or may not be accepted after this function is called.
 * @async
 */
StoragePlugin.prototype.close = async function() { }

/**
 * Clear ALL data from storage.
 * @async
 */
StoragePlugin.prototype.clear = async function() { }
