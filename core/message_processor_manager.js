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

  processInput(bot, msg) {
    const loggerTitle = 'MESSAGE';
    for (let processor of this.processors_) {
      try {
        let result = processor.handle(bot, msg);
        if (result) {
          if (result.then) {
            result.then(() => {}).catch(err => handleError(msg, err, this.monochrome_));
          }

          if (!processor.suppressLogging) {
            this.monochrome_.getLogger().logInputReaction(loggerTitle, msg, processor.name, true);
          }

          return true;
        }
      } catch (err) {
        handleError(msg, err, this.monochrome_);
        return true;
      }
    }

    return false;
  }
}

module.exports = MessageProcessorManager;
