'use strict'
const reload = require('require-reload')(require);
const FileSystemUtils = reload('./util/file_system_utils.js');
const MessageProcessor = reload('./message_processor.js');
const PublicError = reload('./../core/public_error.js');
const strings = reload('./string_factory.js').messageProcessorManager;
const statistics = require('./statistics.js');

function handleError(msg, err, logger, config) {
  const loggerTitle = 'MESSAGE';
  let errorToOutput = err;
  if (!errorToOutput.output) {
    errorToOutput = PublicError.createWithGenericPublicMessage(false, '', err);
  }
  errorToOutput.output(logger, loggerTitle, undefined, msg, true);
}

/**
* Loads and executes commands in response to user input.
*/
class MessageProcessorManager {
  /**
  * @param {Logger} logger - The logger to log to
  */
  constructor(logger) {
    this.logger_ = logger;
    this.processors_ = [];
  }

  /**
  * Loads message processors. Can be called to reload message processors that have been edited.
  */
  load(directory) {
    const loggerTitle = 'MESSAGE MANAGER';
    this.processors_ = [];
    return FileSystemUtils.getFilesInDirectory(directory).then((processorFiles) => {
      for (let processorFile of processorFiles) {
        try {
          let processorInformation = reload(processorFile);
          let processor = new MessageProcessor(processorInformation);
          this.processors_.push(processor);
        } catch (err) {
          this.logger_.logFailure(loggerTitle, 'Failed to load message processor from file: ' + processorFile, err);
        }
      }
      this.processors_.push(new MessageProcessor(reload('./message_processors/user_and_channel_hook.js')));
    }).catch(err => {
      this.logger_.logFailure(loggerTitle, strings.genericLoadingError, err);
    });
  }

  /**
  * Receives and considers agreeing to process user input.
  * @param {Eris.Client} bot - The Eris bot.
  * @param {Eris.Message} msg - The msg to process.
  * @returns {Boolean} True if a message processor accepted responsibility to handle the message and did so, false otherwise.
  */
  processInput(bot, msg) {
    let handledByProcessorName = this.processInputHelper_(bot, msg);
    if (handledByProcessorName) {
      statistics.incrementMessagesProcessedForCommandName(handledByProcessorName, msg.author.id);
      return true;
    }
    return false;
  }

  processInputHelper_(bot, msg) {
    const loggerTitle = 'MESSAGE';
    for (let processor of this.processors_) {
      try {
        let result = processor.handle(bot, msg);
        if (result && result.then) {
          result.then(innerResult => {
            if (typeof innerResult === typeof '') {
              throw PublicError.createWithGenericPublicMessage(false, innerResult);
            }
            this.logger_.logInputReaction(loggerTitle, msg, processor.name, true);
          }).catch(err => handleError(msg, err, this.logger_));
          return processor.name;
        } else if (typeof result === typeof '') {
          throw PublicError.createWithGenericPublicMessage(false, result);
        } else if (result === true) {
          this.logger_.logInputReaction(loggerTitle, msg, processor.name, true);
          return processor.name;
        } else if (result !== false) {
          this.logger_.logFailure(loggerTitle, 'Message processor \'' + processor.name +
            '\' returned an invalid value. It should return true if it will handle the message, false if it will not. A promise will be treated as true and resolved.');
        }
      } catch (err) {
        handleError(msg, err, this.logger_);
        return processor.name;
      };
    }

    return false;
  }
}

module.exports = MessageProcessorManager;
