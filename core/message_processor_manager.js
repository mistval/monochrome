const reload = require('require-reload')(require);
const FileSystemUtils = require('./util/file_system_utils.js');
const MessageProcessor = require('./message_processor.js');
const PublicError = require('./../core/public_error.js');

function handleError(msg, err, monochrome) {
  const loggerTitle = 'MESSAGE';
  let errorToOutput = err;
  if (!errorToOutput.output) {
    errorToOutput = PublicError.createWithGenericPublicMessage(false, '', err);
  }

  errorToOutput.output(loggerTitle, msg, true, monochrome);
}

class MessageProcessorManager {
  constructor(directory, monochrome) {
    this.monochrome_ = monochrome;
    this.processors_ = [];
    this.directory_ = directory;
  }

  load() {
    const loggerTitle = 'MESSAGE MANAGER';
    this.processors_ = [];

    if (this.directory_) {
      const processorFiles = FileSystemUtils.getFilesInDirectory(this.directory_);
      for (let processorFile of processorFiles) {
        try {
          let processorInformation = reload(processorFile);
          let processor = new MessageProcessor(processorInformation, this.monochrome_);
          this.processors_.push(processor);
        } catch (err) {
          this.monochrome_.getLogger().logFailure(loggerTitle, `Failed to load message processor from file: ${processorFile}`, err);
        }
      }
    }
  }

  processInput(erisBot, msg) {
    const loggerTitle = 'MESSAGE';
    for (let processor of this.processors_) {
      try {
        let result = processor.handle(erisBot, msg);
        if (result && result.then) {
          result.then(innerResult => {
            if (typeof innerResult === typeof '') {
              throw PublicError.createWithGenericPublicMessage(false, innerResult);
            }
            if (innerResult !== false) {
              this.monochrome_.getLogger().logInputReaction(loggerTitle, msg, processor.name, true);
            }
          }).catch(err => handleError(msg, err, this.monochrome_));
          return true;
        } else if (typeof result === typeof '') {
          throw PublicError.createWithGenericPublicMessage(false, result);
        } else if (result === true) {
          this.monochrome_.getLogger().logInputReaction(loggerTitle, msg, processor.name, true);
          return true;
        } else if (result !== false) {
          this.monochrome_.getLogger().logFailure(loggerTitle, `Message processor '${processor.name}' returned an invalid value. It should return true if it will handle the message, false if it will not. A promise will be treated as true and resolved.`);
        }
      } catch (err) {
        handleError(msg, err, this.monochrome_);
        return true;
      };
    }

    return false;
  }
}

module.exports = MessageProcessorManager;
