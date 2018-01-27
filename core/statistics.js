const assert = require('assert');

function incrementDictionary(dictionary, key) {
  if (!dictionary[key]) {
    dictionary[key] = 0;
  }
  ++dictionary[key];
}

class Statistics {
  constructor(bot) {
    this.commandsExecuted_ = {};
    this.messagesProcessed_ = {};
    this.uniqueUsers_ = {};
    this.messagesSeen_ = 0;
  }

  initialize(bot) {
    if (this.bot_) {
      return;
    }

    this.bot_ = bot;

    this.bot_.on('messageCreate', msg => {
      ++this.messagesSeen_;
    });

    this.bot_.on('ready', () => {
      if (!this.startTime_) {
        this.startTime_ = Date.now();
      }
    });
  }

  getUptimeInMs() {
    return Date.now() - this.startTime_;
  }

  getUniqueUsersCount() {
    return Object.keys(this.uniqueUsers_).length;
  }

  getCommandsExecutedForCommandName() {
    return this.commandsExecuted_;
  }

  getMessagesProcessedForMessageProcessorName() {
    return this.messagesProcessed_;
  }

  getCommandsExecutedCount() {
    return Object.keys(this.commandsExecuted_).length;
  }

  getMessagesProcessedCount() {
    return Object.keys(this.messagesProcessed_).length;
  }

  getMessagesSeenCount() {
    return this.messagesSeen_;
  }

  incrementCommandsExecutedForCommandName(commandName, userId) {
    incrementDictionary(this.commandsExecuted_, commandName);
    this.uniqueUsers_[userId] = true;
  }

  incrementMessagesProcessedForCommandName(messageProcessorName, userId) {
    incrementDictionary(this.messagesProcessed_, messageProcessorName);
    this.uniqueUsers_[userId] = true;
  }
}

module.exports = new Statistics();
