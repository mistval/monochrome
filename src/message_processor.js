const assert = require('assert');

/**
 * This function will be invoked with any message that the bot receives that is not
 * handled by a command or another message processor. This function examines the message
 * and either ignores it or takes action on it.
 * @callback MessageProcessor~action
 * @param {external:"Eris.Client"} bot
 * @param {external:"Eris.Message"} msg - The message to consider handling.
 * @param {Monochrome} monochrome
 * @returns {boolean|Promise} If the message processor will not handle this message, you should return false (not a promise that resolves to false).
 *   If a promise is returned, the message processor is assumed to have accepted the message, and it will not be propogated further. True may also be returned.
 *   If a promise is returned, it will be resolved, and if it rejects, the error will be handled and logged.
 */

/**
 * A definition of one message processor. Each message processor definition should
 * be a module in your message processors directory (specified as a constructor option to {@link Monochrome}).
 * Each message processor definition file should export one message processor definition.
 * @typedef {Object} MessageProcessor~MessageProcessorDefinition
 * @property {String} name - A name for the message processor. This can be anything, and will not be shown to users.
 *   It exists solely for logging purposes.
 * @property {MessageProcessor~action} action - A function to examine the message, and decide whether to process it.
 * @property {String} [logLevel='info'] - The level to log events to, or 'none' for no logging. Bunyan levels are valid: 'trace', 'debug', 'info', etc.
 * @property {Number} [priority=0] - The priority of the message processor. Higher number means higher priority. Higher priority message
 *   processors get a chance to process the message before lower priority message processors.
 * @example
 * module.exports = {
   name: 'Palindrome',
   action(bot, msg, monochrome) {
     const text = msg.content;
     if (!text || text.length < 2) {
       return false; // Since we are not interested in handling this message, return false.
     }
     const textBackwards = text.split('').reverse().join('');
     if (text === textBackwards) {
       return msg.channel.createMessage('That\'s a palindrome!'); // Since we are handling this message, return a promise (could also return true)
     } else {
       return false; // Since we are not interested in handling this message, return false.
     }
   }
 };
 */

/**
 * Represents a message processor. Message processors cannot be constructed directly.
 * The constructor is shown here due to JSDoc limitations.
 * Message processors are constructed by the MessageProcessorManager which reads the
 * message processor definition modules in your message processors directory (specified as a constructor option to {@link Monochrome})
 * and constructs message processors accordingly. For help constructing a message processor definition,
 * and an example, see {@link MessageProcessor~MessageProcessorDefinition}.
 * For a full working example of a message processor, see the [example palindrome command]{@link https://github.com/mistval/monochrome-demo/blob/master/message_processors/palindrome.js}.
 */
class MessageProcessor {
  constructor(processorData, monochrome) {
    assert(processorData, 'No processor data');
    assert(typeof processorData.action === 'function', 'Processor does not have an \'action\' or it has one that is not a function.');
    assert(typeof processorData.name === 'string', 'Processor does not have a \'name\' or it has one that is not a string.');
    assert(!processorData.priority || typeof processorData.priority === 'number', 'Processor \'priority\' is not a number.');
    assert(!processorData.logLevel || typeof processorData.logLevel === 'string', 'Processor \'logLevel\' is not a string.')

    this.name = processorData.name;
    this.action_ = processorData.action;
    this.monochrome_ = monochrome;
    this.priority = processorData.priority || 0;
    this.logLevel = processorData.logLevel || 'info';
  }

  handle(erisBot, msg) {
    return this.action_(erisBot, msg, this.monochrome_);
  }
}

module.exports = MessageProcessor;
