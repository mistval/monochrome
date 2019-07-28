const fs = require('fs');
const AnsiColor = require('./util/ansi_color_codes.js');
const LogMessageBuilder = require('./util/log_message_builder');
const path = require('path');
const LOGGER_TITLE = 'LOGGER';

const LOG_FILE_PREFIX = 'log_';

function addPrecedingZero(timeString) {
  if (timeString.length === 1) {
    return `0${timeString}`;
  }
  return timeString;
}

function createTimestamp() {
  let now = new Date();
  let year = now.getFullYear().toString();
  let month = (now.getMonth() + 1).toString();
  let day = now.getDate().toString();
  let hour = now.getHours().toString();
  let minute = now.getMinutes().toString();
  let second = now.getSeconds().toString();
  hour = addPrecedingZero(hour);
  minute = addPrecedingZero(minute);
  second = addPrecedingZero(second);
  return `[${month}/${day}/${year} ${hour}:${minute}:${second}]`;
}

/**
 * Log events to the console and to the log file.
 * The Logger can be
 * accessed via {@link Monochrome#getLogger}.
 * @hideconstructor
 */
class Logger {
  constructor(logDirectoryPath, useAnsiColorsInLogFile, consoleOverride) {
    this.console_ = consoleOverride || console;
    this.closed = false;
    this.logToFile_ = !!logDirectoryPath;
    this.userAnsiColorsInLogFile_ = !!useAnsiColorsInLogFile;

    if (this.logToFile_) {
      try {
        fs.mkdirSync(logDirectoryPath, { recursive: true });
      } catch (err) {
        this.console_.warn(`Error creating log directory: ${err}. Disabling logging to file.`);
        this.logToFile_ = false;
      }

      let logFilePath = path.join(logDirectoryPath, `${LOG_FILE_PREFIX}${new Date().toISOString()}.log`);
      this.fileStream_ = fs.createWriteStream(logFilePath);
      this.fileStream_.on('error', (err) => {
        this.logToFile_ = false;
        this.logFailure(LOGGER_TITLE, 'Error logging to file. Disabling logging to file.', err);
      });
    }
  }

  logInputReaction(title, msg, inputReactorTitle, succeeded, failureMessage) {
    let turnAroundTimeMs = Date.now() - msg.timestamp;
    let logMessageBuilder = new LogMessageBuilder();
    logMessageBuilder.setColor(AnsiColor.YELLOW);
    if (msg.channel.guild) {
      logMessageBuilder.append(msg.channel.guild.name);
      logMessageBuilder.setColor(AnsiColor.RESET);
      logMessageBuilder.append(' >> ');
      logMessageBuilder.setColor(AnsiColor.YELLOW);
      logMessageBuilder.append(msg.channel.name);
      logMessageBuilder.setColor(AnsiColor.RESET);
      logMessageBuilder.append(' >> ');
    }
    logMessageBuilder.setColor(AnsiColor.BLUE);
    logMessageBuilder.append(msg.author.username);
    logMessageBuilder.append('#');
    logMessageBuilder.append(msg.author.discriminator);
    logMessageBuilder.setColor(AnsiColor.RESET);
    logMessageBuilder.append(' >> ');
    if (inputReactorTitle) {
      logMessageBuilder.append(`[${inputReactorTitle}]`);
      logMessageBuilder.append(' ');
    }
    logMessageBuilder.setColor(AnsiColor.MAGENTA);
    logMessageBuilder.append(msg.content);

    if (succeeded) {
      logMessageBuilder.setColor(AnsiColor.RESET);
      logMessageBuilder.append(' ');
      logMessageBuilder.append(`(${turnAroundTimeMs}ms turnaround)`);
    }

    if (succeeded) {
      this.logSuccess(title, logMessageBuilder);
    } else {
      if (failureMessage) {
        logMessageBuilder.setColor(AnsiColor.RED);
        logMessageBuilder.append(' ');
        logMessageBuilder.append(`FAILED (${failureMessage})`);
      }
      this.logFailure(title, logMessageBuilder);
    }
  }

  /**
   * Log a message with a successful green color.
   * @param {string} title - The title of the message to log.
   * @param {string} message - The body of the message to log.
   */
  logSuccess(title, message) {
    this.checkState_();
    this.logMessage(title, '\u001b[32m', message);
  }

  /**
   * Log a message with an unsuccessful red color.
   * @param {string} title - The title of the message to log.
   * @param {string} message - The body of the message to log.
   * @param {Error} [err] - The exception that occurred, if applicable. Its stack trace will be logged.
   */
  logFailure(title, message, err) {
    this.checkState_();
    this.logMessage(title, '\u001b[31m', message, err);
  }

  logMessage(title, titleColor, message, err) {
    this.checkState_();

    let messageBuilder = new LogMessageBuilder();
    let timeStamp = createTimestamp();
    messageBuilder.append(timeStamp);
    messageBuilder.append(' ');
    messageBuilder.setColor(titleColor);
    messageBuilder.append(title);
    messageBuilder.append(' ');
    messageBuilder.setColor(AnsiColor.RESET);
    messageBuilder.append(message);
    messageBuilder.setColor(AnsiColor.RESET);

    if (err && err.stack) {
      messageBuilder.append(' ');
      messageBuilder.setColor(AnsiColor.RED);
      messageBuilder.append(err.stack);
      messageBuilder.setColor(AnsiColor.RESET);
    }

    const messageWithFormatting = messageBuilder.getMessageWithFormatting();
    this.console_.log(messageWithFormatting);

    if (this.logToFile_) {
      if (this.useAnsiColorsInLogFile) {
        this.fileStream_.write(`${messageWithFormatting}\n`);
      } else {
        this.fileStream_.write(`${messageBuilder.getMessageWithoutFormatting()}\n`);
      }
    }
  }

  close() {
    if (this.closed) {
      return Promise.resolve();
    }

    this.closed = true;

    return new Promise((fulfill, reject) => {
      if (!this.fileStream_) {
        fulfill();
      } else {
        this.fileStream_.end(err => {
          if (err) {
            this.console_.warn('Error closing log stream');
            return reject(err);
          }
          return fulfill();
        });
      }
    });
  }

  checkState_() {
    if (this.closed) {
      throw new Error('The logger has been closed');
    }
  }
}

module.exports = Logger;
module.exports.LOG_FILE_PREFIX = LOG_FILE_PREFIX;
