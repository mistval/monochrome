const chalk = require('chalk');
const timestamp = require('time-stamp');

// It's the console logger. It needs to use the console.
/* eslint no-console: off */

function createContextString(guild, channel, user) {
  const parts = [];
  if (guild) {
    parts.push(chalk.yellow(guild.name));
  }
  if (channel && channel.name) {
    parts.push(chalk.yellow(channel.name));
  }
  if (user) {
    parts.push(chalk.blue(`${user.username}#${user.discriminator}`));
  }

  if (parts.length === 0) {
    return '';
  }

  return ` ${parts.join(' >> ')} >>`;
}

function buildLogString(header, eventName, detail, component, guild, channel, user, message) {
  const timeStamp = timestamp.utc('[MM/DD/YYYY HH:mm:ss]');
  const componentPart = chalk.black.bgWhite(` ${component} `);
  const subDetailPart = detail ? ` ${chalk.magenta(detail)}` : '';
  const contextPart = createContextString(guild, channel, user);
  const messagePart = message ? ` ${message.content}` : '';
  const eventNamePart = eventName ? ` ${chalk.underline(eventName)}` : '';
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
      coercedInfo.msg = info.toString();
    } else {
      throw new Error(`Invalid log input: ${info}`);
    }

    // If guild, channel, and/or user are not specified at the top level in info,
    // get them from the message.
    if (coercedInfo.message) {
      coercedInfo.guild = coercedInfo.guild || coercedInfo.message.channel.guild;
      coercedInfo.channel = coercedInfo.channel || coercedInfo.message.channel;
      coercedInfo.user = coercedInfo.user || coercedInfo.message.author;
    }

    const printLog = logToStderr ? this.warnFunction : this.logFunction;
    const printError = errToStderr ? this.warnFunction : this.logFunction;

    const {
      event, msg, guild, channel, user, message, err,
    } = coercedInfo;

    printLog(buildLogString(header, event, msg, this.component, guild, channel, user, message));
    if (err) {
      printError(chalk.red(err.stack));
    }
  }

  fatal(info) {
    this.log(chalk.yellow.bgRed.bold(' FATAL ERROR '), info, true, true);
  }

  error(info) {
    this.log(chalk.yellow.bgRed(' ERROR '), info, true, true);
  }

  warn(info) {
    this.log(chalk.black.bgYellow(' WARNING '), info, false, false);
  }

  info(info) {
    this.log(chalk.white.bgBlue(' INFO '), info, false, false);
  }

  debug(info) {
    this.log(chalk.black.bgHex('#DEADED')(' DEBUG '), info, false, false);
  }

  trace(info) {
    this.log(chalk.black.bgHex('#DEADED')(' TRACE '), info, false, false);
  }

  // Function required by implicit interface contract (with bunyan)
  // eslint-disable-next-line class-methods-use-this
  child({ component }) {
    return new ConsoleLogger(component, this.logFunction, this.warnFunction);
  }
}

module.exports = ConsoleLogger;
