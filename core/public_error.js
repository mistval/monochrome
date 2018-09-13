'use strict'
const assert = require('assert');
const constants = require('./constants.js');

const MISSING_PERMS_DISCORD_ERROR_SUBSTR = 'Missing Permissions';
const DELETION_TIME_MS = 7000;
const INTERNAL_LOGGER_TITLE = 'ERROR HANDLER';

const PublicMessageType = {
  NONE: 0,
  GENERIC: 1,
  INSUFFICIENT_PRIVILEGE: 2,
};

async function sendMessageAndDelete(msg, messageToSend, logger) {
  let sentMessage = await msg.channel.createMessage(messageToSend);
  setTimeout(
    () => {
      sentMessage.delete('Auto delete error message').catch(err => {
        logger.logFailure(INTERNAL_LOGGER_TITLE, 'Error trying to automatically delete error message', err);
      });
    },
    DELETION_TIME_MS
  );

  return sentMessage;
}

class PublicError extends Error {
  constructor(publicMessage, deleteAutomatically, logDescription, internalErr) {
    super(publicMessage, internalErr && internalErr.fileName, internalErr && internalErr.lineNumber);
    this.publicMessage_ = publicMessage;
    this.internalErr_ = internalErr;
    this.logDescription_ = logDescription;
    this.deleteAutomatically_ = !!deleteAutomatically;
  }

  static createWithCustomPublicMessage(publicMessage, deleteAutomatically, logDescription, internalErr) {
    return new PublicError(publicMessage, deleteAutomatically, logDescription, internalErr);
  }

  static createWithGenericPublicMessage(deleteAutomatically, logDescription, internalErr) {
    return new PublicError(PublicMessageType.GENERIC, deleteAutomatically, logDescription, internalErr);
  }

  static createWithNoPublicMessage(logDescription, internalErr) {
    return new PublicError(PublicMessageType.NONE, false, logDescription, internalErr);
  }

  static createInsufficientPrivilegeError(err) {
    if (err.output && err.publicMessage_ === PublicMessageType.INSUFFICIENT_PRIVILEGE) {
      return err;
    }
    let isInsufficientPrivilegeError = err.message.indexOf(MISSING_PERMS_DISCORD_ERROR_SUBSTR) !== -1;
    if (isInsufficientPrivilegeError) {
      return new PublicError(PublicMessageType.INSUFFICIENT_PRIVILEGE, false, 'Insufficient privileges', err);
    }
  }

  async output(loggerTitle, msg, forceSilentFail, monochrome) {
    const logger = monochrome.getLogger();
    const prefix = monochrome.getPersistence().getPrimaryPrefixFromMsg(msg);

    let publicMessage = this.publicMessage_;
    if (forceSilentFail) {
      publicMessage = PublicMessageType.NONE;
    }
    if (publicMessage === PublicMessageType.GENERIC) {
      publicMessage = monochrome.getGenericErrorMessage();
    } else if (publicMessage === PublicMessageType.INSUFFICIENT_PRIVILEGE) {
      publicMessage = monochrome.getMissingPermissionsErrorMessage();
    } else if (publicMessage === PublicMessageType.NONE) {
      publicMessage = undefined;
    }

    if (publicMessage) {
      if (typeof publicMessage === typeof '') {
        publicMessage = publicMessage.replace(constants.PREFIX_REPLACE_REGEX, prefix);
      } else if (typeof publicMessage.content === typeof '') {
        publicMessage.content = publicMessage.content.replace(constants.PREFIX_REPLACE_REGEX, prefix);
      }

      try {
        if (this.deleteAutomatically_) {
          await sendMessageAndDelete(msg, publicMessage, logger);
        } else {
          await msg.channel.createMessage(publicMessage, undefined, msg);
        }
      } catch(err) {
        logger.logFailure(INTERNAL_LOGGER_TITLE, 'Error sending public error message for error.', err);
      }
    }

    let logDescription = this.logDescription_;
    if (!logDescription) {
      logDescription = 'Error';
    }

    logger.logInputReaction(loggerTitle, msg, '', false, logDescription);
    if (this.internalErr_) {
      logger.logFailure(loggerTitle, `Command '${msg.content}' errored.`, this.internalErr_);
    }
  }
}

module.exports = PublicError;
