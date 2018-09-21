const NavigationChapter = require('./navigation_chapter.js');

const LOGGER_TITLE = 'NAVIGATION';
const EDIT_DELAY_TIME_IN_MS = 1500;

function sendReactions(msg, reactions, logger) {
  let promise = Promise.resolve();
  for (let reaction of reactions) {
    promise = promise.then(() => {
      return msg.channel.addMessageReaction(msg.id, reaction);
    }).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Failed to add reaction button to navigation', err);
    });
  }
}

class Navigation {
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

  static fromOneNavigationChapter(ownerId, navigationChapter) {
    const chapterForEmojiName = { a: navigationChapter };
    return new Navigation(ownerId, true, 'a', chapterForEmojiName);
  }

  static fromOneDimensionalContents(ownerId, contents) {
    const chapter = NavigationChapter.fromContent(contents);
    return Navigation.fromOneNavigationChapter(ownerId, chapter);
  }

  createMessage(msg, logger) {
    let chapter = this.getChapterForEmojiName_(this.currentEmojiName_);
    return chapter.getCurrentPage(logger).then(navigationPage => {
      if (!navigationPage) {
        throw new Error('Navigation failed to create initial page.');
      }
      if (navigationPage.showPageArrows !== undefined) {
        this.showPageArrows_ = navigationPage.showPageArrows;
      }
      return msg.channel.createMessage(navigationPage, undefined, msg);
    }).then(sentMessage => {
      let emojis = Object.keys(this.chapterForEmojiName_);
      let reactionsToSend = [];
      if (emojis.length > 1) {
        reactionsToSend = reactionsToSend.concat(emojis);
      }

      if (this.showPageArrows_) {
        reactionsToSend.push('⬅');
        reactionsToSend.push('➡');
      }

      sendReactions(sentMessage, reactionsToSend, logger);
      this.message_ = sentMessage;
      return sentMessage.id;
    }).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Failed to create navigation.', err);
      throw err;
    });
  }

  handleEmojiToggled(bot, emoji, userId, logger) {
    if (bot.user.id === userId) {
      return;
    } else if (emoji.name === this.currentEmojiName_) {
      return;
    } else if (userId !== this.ownerId_) {
      return;
    }

    this.actionAccumulator_.enqueue(() => {
      let pagePromise = undefined;
      let desiredEmojiName = emoji.name;

      if (this.showPageArrows_ && emoji.name === '⬅') {
        pagePromise = this.getChapterForEmojiName_(this.currentEmojiName_).flipToPreviousPage(logger);
        desiredEmojiName = this.currentEmojiName_;
      } else if (this.showPageArrows_ && emoji.name === '➡') {
        pagePromise = this.getChapterForEmojiName_(this.currentEmojiName_).flipToNextPage(logger);
        desiredEmojiName = this.currentEmojiName_;
      } else {
        let chapter = this.getChapterForEmojiName_(emoji.name);
        if (!chapter) {
          return;
        }
        this.currentEmojiName_ = emoji.name;
        pagePromise = chapter.getCurrentPage(logger);
      }

      pagePromise.then(navigationPage => {
        if (navigationPage && desiredEmojiName === this.currentEmojiName_) {
          return this.message_.edit(navigationPage);
        }
      }).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Error navigating.', err);
      });
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
