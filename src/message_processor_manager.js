const FileSystemUtils = require('./util/file_system_utils.js');
const MessageProcessor = require('./message_processor.js');
const handleError = require('./handle_error.js');

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
          let processorInformation = require(processorFile);
          let processor = new MessageProcessor(processorInformation, this.monochrome_);
          this.processors_.push(processor);
        } catch (err) {
          this.logger.error({
            event: 'FAILED TO LOAD MESSAGE PROCESSOR',
            file: processorFile,
          });
        }
      }

      this.processors_.sort((a, b) => b.priority - a.priority);
    }
  }

  processInput(bot, msg) {
    for (let processor of this.processors_) {
      try {
        let result = processor.handle(bot, msg);
        if (result) {
          if (result.then) {
            result.then(() => {}).catch(err => handleError(this.logger, 'MESSAGE PROCESSOR ERROR', this.monochrome_, msg, err, true));
          }

          if (processor.logLevel !== 'none') {
            this.logger[processor.logLevel]({
              event: 'MESSAGE HANDLED',
              processorName: processor.name,
              message: msg,
              detail: processor.name,
            });
          }

          return true;
        }
      } catch (err) {
        handleError(this.logger, 'MESSAGE PROCESSOR ERROR', this.monochrome_, msg, err, true);
        return true;
      }
    }

    return false;
  }
}

module.exports = MessageProcessorManager;
