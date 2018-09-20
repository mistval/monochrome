'use strict'
const reload = require('require-reload')(require);

class MessageProcessor {
  constructor(processorData, monochrome) {
    if (!processorData) {
      throw new Error('No processor data');
    }
    if (!processorData.action || typeof processorData.action !== 'function') {
      throw new Error('Processor does not have an action, or it is not a function.');
    }
    if (!processorData.name || typeof processorData.name !== typeof '') {
      throw new Error('Processor does not have a name , or it is not a string.');
    }
    if (processorData.initialize) {
      processorData.initialize(monochrome);
    }

    this.name = processorData.name;
    this.action_ = processorData.action;
    this.monochrome_ = monochrome;
  }

  handle(erisBot, msg) {
    return this.action_(erisBot, msg, this.monochrome_);
  }
}

module.exports = MessageProcessor;
