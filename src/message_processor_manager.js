const reload = require('require-reload')(require);
const FileSystemUtils = require('./util/file_system_utils.js');
const MessageProcessor = require('./message_processor.js');
const PublicError = require('./public_error.js');

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
    this.logger = monochrome.getLogger().child({
      component: 'Monochrome::MessageProcessorManager',
    });
  }

  load() {
    this.processors_ = [];

    if (this.directory_) {
      const processorFiles = FileSystemUtils.getFilesInDirectory(this.directory_);
      for (let processorFile of processorFiles) {
        try {
          let processorInformation = reload(processorFile);
          let processor = new MessageProcessor(processorInformation, this.monochrome_);
          this.processors_.push(processor);
        } catch (err) {
          this.logger.error({
            event: 'FAILED TO LOAD MESSAGE PROCESSOR',
            file: processorFile,
          });
        }
      }
    }
  }

  processInput(bot, msg) {
    for (let processor of this.processors_) {
      try {
        let result = processor.handle(bot, msg);
        if (result) {
          if (result.then) {
            result.then(() => {}).catch(err => handleError(msg, err, this.monochrome_));
          }

          if (processor.logLevel !== 'none') {
            this.logger[processor.logLevel]({
              event: 'MESSAGE HANDLED',
              messageHandler: processor.name,
              msg,
              user: msg.author,
              guild: msg.channel.guild,
              channel: msg.channel,
            });
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