'use strict'
const fs = require('fs');
const AnsiColor = require('./util/ansi_color_codes.js');
const LogMessageBuilder = require('./util/log_message_builder');
const mkdirpSync = require('mkdirp').sync;
const path = require('path');

const LOG_FILE_PREFIX = 'log_';

function addPrecedingZero(timeString) {
  if (timeString.length === 1) {
    return '0' + timeString;
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
  return '[' + month + '/' + day + '/' + year + ' ' + hour + ':' + minute + ':' + second + ']';
}

class Logger {
  constructor(logDirectoryPath, useAnsiColorsInLogFile, consoleOverride) {
    this.console_ = consoleOverride || console;
    this.closed_ = false;
    this.logToFile_ = !!logDirectoryPath;
    this.userAnsiColorsInLogFile_ = !!useAnsiColorsInLogFile;

    if (this.logToFile_) {
      try {
        mkdirpSync(logDirectoryPath);
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
      logMessageBuilder.append('[' + inputReactorTitle + '] ');
    }
    logMessageBuilder.setColor(AnsiColor.MAGENTA);
    logMessageBuilder.append(msg.content);

    if (succeeded) {
      logMessageBuilder.setColor(AnsiColor.RESET);
      logMessageBuilder.append(' (' + turnAroundTimeMs + 'ms turnaround)');
    }

    if (succeeded) {
      this.logSuccess(title, logMessageBuilder);
    } else {
      if (failureMessage) {
        logMessageBuilder.setColor(AnsiColor.RED);
        logMessageBuilder.append(' FAILED (' + failureMessage + ')');
      }
      this.logFailure(title, logMessageBuilder);
    }
  }

  logSuccess(title, message) {
    this.checkState_();
    this.logMessage(title, '\u001b[32m', message);
  }

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

    let errString = '';
    if (err) {
      errString += `${err.stack}\n`;

      messageBuilder.append(' ');
      messageBuilder.setColor(AnsiColor.RED);
      messageBuilder.append(errString);
      messageBuilder.setColor(AnsiColor.RESET);
    }

    const messageWithFormatting = messageBuilder.getMessageWithFormatting();
    this.console_.log(messageWithFormatting);

    if (this.logToFile_) {
      if (this.useAnsiColorsInLogFile) {
        this.fileStream_.write(messageWithFormatting + '\n');
      } else {
        this.fileStream_.write(messageBuilder.getMessageWithoutFormatting() + '\n');
      }
    }
  }

  close() {
    if (this.closed_) {
      return Promise.resolve();
    }

    this.closed_ = true;

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
    if (this.closed_) {
      throw new Error('The logger has been closed');
    }
  }
}

module.exports = Logger;
module.exports.LOG_FILE_PREFIX = LOG_FILE_PREFIX;
