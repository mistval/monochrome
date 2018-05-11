class NavigationManagerImplementation {
  static register(navigationManagerState, navigation, expirationTimeInMs, msg, logger) {
    return navigation.createMessage(msg, navigationManagerState.logger_).then(messageId => {
      navigationManagerState.navigationForMessageId_[messageId] = navigation;
      setTimeout(NavigationManagerImplementation.unregister_, expirationTimeInMs, navigationManagerState, messageId);
    });
  }

  static unregister_(navigationManagerState, messageId) {
    delete navigationManagerState.navigationForMessageId_[messageId];
  }

  static handleEmojiToggled(navigationManagerState, bot, msg, emoji, userId) {
    let navigation = navigationManagerState.navigationForMessageId_[msg.id];
    if (navigation) {
      navigation.handleEmojiToggled(bot, emoji, userId, navigationManagerState.logger_);
    }
  }
}

module.exports = NavigationManagerImplementation;
