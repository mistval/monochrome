/**
 * Handles displaying and controlling {@link Navigation}s.
 * The NavigationManager can be
 * accessed via {@link Monochrome#getNavigationManager}.
 * @hideconstructor
 */
class NavigationManager {
  constructor(logger) {
    this.navigationForMessageId_ = {};
    this.logger_ = logger;
  }

  /**
   * Display a navigation.
   * @param {Navigation} navigation - The navigation to display.
   * @param {number} expirationTimeInMs - How long before the navigation should become
   *   inactive and cease responding to reactions. Note that showing a navigation takes memory,
   *   so if this number is excessively high, you may run out of memory eventually (unlikely to ever
   *   happen except for very popular bots).
   * @param {Eris.Channel} channel - The channel to show the navigation in ({@link Eris.Message} has a .channel property to get this)
   * @param {Eris.Message} [parentMsg] - The user message that caused the navigation to be created.
   *   If that message is deleted, the bot will delete the navigation. Omit if you don't want that
   *   behavior.
   */
  show(navigation, expirationTimeInMs, channel, parentMsg) {
    return navigation.createMessage(channel, parentMsg, this.logger_).then(messageId => {
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
