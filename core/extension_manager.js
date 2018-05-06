'use strict'
const reload = require('require-reload')(require);
const FileSystemUtils = reload('./util/file_system_utils.js');
const PublicError = reload('./../core/public_error.js');

/**
* Loads and executes extensions.
*/
class ExtensionManager {
  /**
  * @param {Logger} logger - The logger to log to
  */
  constructor(logger) {
    this.logger_ = logger;
  }

  /**
  * Loads extensions. Can be called to reload extensions that have been edited.
  */
  async load(directory, erisBot) {
    const loggerTitle = 'EXTENSIONS';
    try {
      const extensionFiles = await FileSystemUtils.getFilesInDirectory(directory);
      for (let extensionFile of extensionFiles) {
        try {
          let extension = reload(extensionFile);
          let invoke = extension.invoke;

          if (typeof invoke !== 'function') {
            throw new Error('Extension does not have an invoke property, or it is not a function.');
          }

          invoke(erisBot);
          this.logger_.logSuccess(loggerTitle, `Loaded and invoked extension '${extensionFile}'`);
        } catch (err) {
          this.logger_.logFailure(loggerTitle, 'Failed to load extension from file: ' + extensionFile, err);
        }
      }
    } catch (err) {
      this.logger_.logFailure(loggerTitle, 'Error loading extensions', err);
    }
  }
}

module.exports = ExtensionManager;
