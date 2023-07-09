const util = require('util');
const Chalk = require('chalk');
const timestamp = require('time-stamp');

const functionForBunyanIntLogLevel = {
  60: 'fatal',
  50: 'error',
  40: 'warn',
  30: 'info',
  20: 'debug',
  10: 'trace',
};

// It's the console logger. It needs to use the console.
/* eslint no-console: off */

function createContextString(guild, channel, user) {
  const parts = [];
  if (guild) {
    parts.push(Chalk.yellow(guild.name));
  }
  if (channel && channel.name) {
    parts.push(Chalk.yellow(channel.name));
  }
  if (user) {
    parts.push(Chalk.blue(user.username));
  }

  if (parts.length === 0) {
    return '';
  }

  return ` ${parts.join(' >> ')}`;
}

function buildLogString(header, eventName, detail, component, guild, channel, user, message) {
  const timeStamp = timestamp.utc('[MM/DD/YYYY HH:mm:ss]');
  const componentPart = component ? Chalk.black.bgWhite(` ${component} `) : '';
  const subDetailPart = detail ? ` [${Chalk.magenta(detail)}]` : '';
  const contextPart = createContextString(guild, channel, user);
  const messagePart = message?.content ? ` >> ${message.content}` : '';
  const eventNamePart = eventName ? ` ${Chalk.underline(eventName)}` : '';
  return `${timeStamp} ${header}${componentPart}${eventNamePart}${contextPart}${messagePart}${subDetailPart}`;
}

class ConsoleLogger {
  constructor(component, logFunction = console.log, warnFunction = console.warn) {
    this.component = component;
    this.logFunction = logFunction;
    this.warnFunction = warnFunction;
  }

  log(header, info, logToStderr, errToStderr) {
    const coercedInfo = {};
    if (typeof info === 'object') {
      Object.assign(coercedInfo, info);
    } else if (typeof info === 'string' || typeof info === 'number' || typeof info === 'boolean') {
      coercedInfo.detail = info.toString();
    } else {
      throw new Error(`Invalid log input: ${info}`);
    }

    // If guild, channel, and/or user are not specified at the top level in info,
    // get them from the message.
    if (coercedInfo.message) {
      if (coercedInfo.message.channel) {
        coercedInfo.guild = coercedInfo.guild || coercedInfo.message.channel.guild;
      }

      coercedInfo.channel = coercedInfo.channel || coercedInfo.message.channel;
      coercedInfo.user = coercedInfo.user || coercedInfo.message.author;
    }

    const printLog = logToStderr ? this.warnFunction : this.logFunction;
    const printError = errToStderr ? this.warnFunction : this.logFunction;

    const {
      event, detail, guild, channel, user, message, err,
    } = coercedInfo;

    printLog(buildLogString(header, event, detail, this.component, guild, channel, user, message));
    if (err) {
      printError(Chalk.red(util.inspect(err.stack)));
    }
  }

  fatal(info) {
    this.log(Chalk.yellow.bgRed.bold(' FATAL ERROR '), info, true, true);
  }

  error(info) {
    this.log(Chalk.yellow.bgRed(' ERROR '), info, true, true);
  }

  warn(info) {
    this.log(Chalk.black.bgYellow(' WARNING '), info, false, false);
  }

  info(info) {
    this.log(Chalk.white.bgBlue(' INFO '), info, false, false);
  }

  debug(info) {
    this.log(Chalk.black.bgHex('#DEADED')(' DEBUG '), info, false, false);
  }

  trace(info) {
    this.log(Chalk.black.bgHex('#DEADED')(' TRACE '), info, false, false);
  }

  child({ component }) {
    return new ConsoleLogger(component, this.logFunction, this.warnFunction);
  }

  streamWrite(data) {
    const logFn = functionForBunyanIntLogLevel[data.level];
    if (!logFn) {
      this.warnFunction('Unknown log level:');
      this.warnFunction(data);
      return;
    }

    this[logFn](data);
  }

  stream(logLevel) {
    return {
      level: logLevel || 'trace',
      type: 'raw',
      stream: {
        write: this.streamWrite.bind(this),
      },
    };
  }
}

module.exports = ConsoleLogger;
