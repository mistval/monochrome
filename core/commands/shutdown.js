'use strict'
const reload = require('require-reload')(require);
const ErisUtils = reload('./../util/eris_utils.js');
const PublicError = require('./../public_error.js');

/**
* A command for reloading the command and message managers. This is a special command that the command manager has direct knowledge of.
*/
class Reload {
  /**
  * @param {function} reloadAction - The lambda to execute a reload.
  */
  constructor(shutdownAction) {
    this.commandAliases = ['}shutdown'];
    this.canBeChannelRestricted = false;
    this.botAdminOnly = true;
    this.action = (erisBot, monochromeBot, msg) => this.execute_(msg, shutdownAction);
  }

  execute_(msg, shutdownAction) {
    try {
      let promise = ErisUtils.sendMessageAndDelete(msg, 'Shutting down!');
      shutdownAction();
      return promise;
    } catch (err) {
      let errorMessage = 'There was an unhandled error while shutting down. Monochrome may or may not shut down. If it does not, you should kill it. Check the logs for more details.';
      throw PublicError.createWithCustomPublicMessage(errorMessage, false, undefined, err);
    }
  }
}

module.exports = Reload;
