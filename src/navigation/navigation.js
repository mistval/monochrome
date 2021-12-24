const NavigationChapter = require('./navigation_chapter.js');

const EDIT_DELAY_TIME_IN_MS = 1500;

function canReact(msg, ownId) {
  if (!msg.channel.permissionsOf) {
    return true;
  }

  const ownPermissions = msg.channel.permissionsOf(ownId);
  return ownPermissions.has('addReactions') && ownPermissions.has('readMessageHistory');
}

async function sendReactions(msg, reactions, ownId, logger) {
  if (!canReact(msg, ownId)) {
    return logger.warn({
      event: 'NO PERMISSION TO ADD REACTION BUTTONS',
    });
  }

  for (let i = 0; i < reactions.length; i += 1) {
    const reaction = reactions[i];
    try {
      await msg.addReaction(reaction);
    } catch (err) {
      logger.warn({
        event: 'FAILED TO ADD REACTION BUTTONS',
        err,
      });

      if (err.code === 50001 || err.code === 50013 || err.code === 10008) {
        return; // Missing permissions error or unknown message error (probably already deleted). Don't bother trying to send the other reactions.
      }
    }
  }
}

/**
 * Represents a collection of messages that can be navigated in two dimensions
 * via reaction buttons below the message. A navigation is a collection of {@link NavigationChapter}s.
 * Each navigation chapter controls a one-dimensional slice of navigable content.
 * The user can move forward and backward within a chapter by using the arrow reaction
 * buttons, and can switch chapters by using the other reaction buttons.<br><br>
 * Once a Navigation is constructed, it can be shown to the user by using {@link NavigationManager#show}.
 * For an example of creating a navigation, see the [demo navigation command]{@link https://github.com/mistval/monochrome-demo/blob/master/commands/navigation.js}.
 */
class Navigation {
  /**
  * Construct a Navigation. If this Navigation only has one {@link NavigationChapter}, use the
  * {@link Navigation.fromOneNavigationChapter} factory method instead. If you only
  * need left and right pagination, and you already have all the content you want to display
  * to the user, use the {@link Navigation.fromOneDimensionalContents} factory method instead.
  * @param {string} ownerId - The user ID of the user who is allowed to use the reaction buttons to navigate.
  * @param {boolean} showPageArrows - Whether to show the arrow reactions or not. If you know in advance
  *   that none of your {@link NavigationChapter}s have more than one page, you can set this to false.
  * @param {string} initialEmojiName - The name of the emoji for the chapter to show initially.
  * @param {Object.<string, NavigationChapter>} chapterForEmojiName - An object where the keys are emoji names and the values are {@link NavigationChapter}s.
  *   When the emoji is clicked, control will switch to the specified chapter. To find the name of an emoji, enter the emoji in
  *   Discord's chat box, put a \ in front of it, and hit enter.
  */
  constructor(ownerId, showPageArrows, initialEmojiName, chapterForEmojiName) {
    let keys = Object.keys(chapterForEmojiName);
    if (keys.indexOf(initialEmojiName) === -1) {
      throw new Error('Value of initialEmojiName not found in chapterForEmojiName');
    }
    this.showPageArrows_ = showPageArrows;
    this.chapterForEmojiName_ = chapterForEmojiName;
    this.currentEmojiName_ = initialEmojiName;
    this.ownerId_ = ownerId;
    this.actionAccumulator_ = new ActionAccumulator(EDIT_DELAY_TIME_IN_MS);
  }

  /**
   * Construct a Navigation with just one chapter. Only the arrow reactions will
   * be shown and navigation will only be possible in one dimension.
   * If you already have all the content you want to display to the user,
   * you can use the {@link Navigation.fromOneDimensionalContents} factory method instead
   * and avoid having to construct a {@link NavigationChapter} yourself.
   * @param {string} ownerId - The user ID of the user who is allowed to use the reaction buttons to navigate.
   * @param {NavigationChapter} navigationChapter - The {@link NavigationChapter} to show.
   * @param {boolean} showPageArrows - Whether to show the page arrows or not.
   */
  static fromOneNavigationChapter(ownerId, navigationChapter, showPageArrows=true) {
    const chapterForEmojiName = { a: navigationChapter };
    return new Navigation(ownerId, showPageArrows, 'a', chapterForEmojiName);
  }

  /**
   * Construct a Navigation from an array of [Discord embed structures]{@link https://discordapp.com/developers/docs/resources/channel#embed-object} (or strings).
   * Only the arrow reactions will be shown and navigation will only be possible in one dimension.
   * @param {string} ownerId - The user ID of the user who is allowed to use the reaction buttons to navigate.
   * @param {string[]|Object[]} contents - The strings or [Discord embed structures]{@link https://discordapp.com/developers/docs/resources/channel#embed-object}
   *   to show in the navigation.
   */
  static fromOneDimensionalContents(ownerId, contents) {
    const chapter = NavigationChapter.fromContent(contents);
    return Navigation.fromOneNavigationChapter(ownerId, chapter, contents.length > 1);
  }

  async createMessage(channel, parentMsg, ownId, logger) {
    const chapter = this.getChapterForEmojiName_(this.currentEmojiName_);
    const navigationPage = await chapter.getCurrentPage(logger);

    if (!navigationPage) {
      throw new Error('Navigation failed to create initial page.');
    }
    if (navigationPage.showPageArrows !== undefined) {
      this.showPageArrows_ = navigationPage.showPageArrows;
    }

    const sentMessage = await channel.createMessage({ ...navigationPage }, undefined, parentMsg);

    const emojis = Object.keys(this.chapterForEmojiName_);
    const reactionsToSend = [];
    if (emojis.length > 1) {
      reactionsToSend.push(...emojis);
    }

    if (this.showPageArrows_) {
      reactionsToSend.push('⬅');
      reactionsToSend.push('➡');
    }

    sendReactions(sentMessage, reactionsToSend, ownId, logger);
    this.message_ = sentMessage;
    return sentMessage.id;
  }

  handleEmojiToggled(bot, emoji, userId, logger) {
    if (bot.user.id === userId) {
      return;
    } else if (emoji.name === this.currentEmojiName_) {
      return;
    } else if (userId !== this.ownerId_) {
      return;
    }

    this.actionAccumulator_.enqueue(async () => {
      let desiredEmojiName = emoji.name;

      try {
        let navigationPage;
        if (this.showPageArrows_ && emoji.name === '⬅') {
          desiredEmojiName = this.currentEmojiName_;
          navigationPage = await this.getChapterForEmojiName_(this.currentEmojiName_).flipToPreviousPage(logger);
        } else if (this.showPageArrows_ && emoji.name === '➡') {
          desiredEmojiName = this.currentEmojiName_;
          navigationPage = await this.getChapterForEmojiName_(this.currentEmojiName_).flipToNextPage(logger);
        } else {
          let chapter = this.getChapterForEmojiName_(emoji.name);
          if (!chapter) {
            return;
          }
          this.currentEmojiName_ = emoji.name;
          navigationPage = await chapter.getCurrentPage(logger);
        }

        if (navigationPage && desiredEmojiName === this.currentEmojiName_) {
          await this.message_.edit({ ...navigationPage });
        }

      } catch (err) {
        logger.error({
          event: 'ERROR NAVIGATING',
          err,
        });
      }
    });
  }

  getChapterForEmojiName_(emojiName) {
    let keys = Object.keys(this.chapterForEmojiName_);
    for (let key of keys) {
      if (key === emojiName) {
        return this.chapterForEmojiName_[key];
      }
    }

    return;
  }
}

class ActionAccumulator {
  constructor(delayInMs) {
    this.delayInMs_ = delayInMs;
    this.timerInFlight_ = false;
    this.callback_ = undefined;
  }

  enqueue(callback) {
    if (this.timerInFlight_) {
      this.callback_ = callback;
    } else {
      this.timerInFlight_ = true;
      callback();
      setTimeout(() => {
        this.timerInFlight_ = false;
        if (this.callback) {
          this.callback_();
          this.callback_ = undefined;
        }
      },
      this.delayInMs);
    }
  }
}

module.exports = Navigation;
