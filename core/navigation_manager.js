class NavigationManager {
  constructor(logger) {
    this.navigationForMessageId_ = {};
    this.logger_ = logger;
  }

  show(navigation, expirationTimeInMs, msg) {
    return navigation.createMessage(msg, this.logger_).then(messageId => {
      this.navigationForMessageId_[messageId] = navigation;
      setTimeout(() => delete this.navigationForMessageId_[messageId], expirationTimeInMs);
    });
  }

  handleEmojiToggled(bot, msg, emoji, userId) {
    let navigation = this.navigationForMessageId_[msg.id];
    if (navigation) {
      navigation.handleEmojiToggled(bot, emoji, userId, this.logger_);
    }
  }
}

module.exports = NavigationManager;
