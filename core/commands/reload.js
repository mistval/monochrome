'use strict'
const reload = require('require-reload')(require);
const ErisUtils = reload('./../util/eris_utils.js');
const logger = require('./../logger.js');

/**
* A command for reloading the command and message managers. This is a special command that the command manager has direct knowledge of.
*/
class Reload {
  /**
  * @param {function} reloadAction - The lambda to execute a reload.
  */
  constructor(reloadAction) {
    this.commandAliases = ['}reload'];
    this.canBeChannelRestricted = false;
    this.botAdminOnly = true;
    this.hidden = true;
    this.action = (bot, msg, suffix) => this.execute_(bot, msg, suffix, reloadAction);
  }

  execute_(bot, msg, suffix, reloadAction) {
    try {
      reloadAction();
      ErisUtils.sendMessageAndDelete(msg, 'Reloaded!');
    } catch (err) {
      let errorMessage = 'There was an unhandled error while reloading. Monochrome will continue to run, but may be in a bad state. You should restart it as soon as possible. Check the logs for more details.';
      msg.channel.createMessage(errorMessage);
      logger.logFailure('RELOAD', errorMessage, err);
    }
  }
}

module.exports = Reload;
