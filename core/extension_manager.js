'use strict'
const reload = require('require-reload')(require);
const FileSystemUtils = reload('./util/file_system_utils.js');
const PublicError = reload('./../core/public_error.js');

/**
* Loads and executes extensions.
*/
class ExtensionManager {
  /**
  * Loads extensions. Can be called to reload extensions that have been edited.
  */
  async load(directory, monochromeBot) {
    const logger = monochromeBot.getLogger();
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

          await invoke(monochromeBot);
          logger.logSuccess(loggerTitle, `Loaded and invoked extension '${extensionFile}'`);
        } catch (err) {
          logger.logFailure(loggerTitle, 'Failed to load extension from file: ' + extensionFile, err);
        }
      }
    } catch (err) {
      logger.logFailure(loggerTitle, 'Error loading extensions', err);
    }
  }
}

module.exports = ExtensionManager;
