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
  const timeStamp = timestamp.utc('[MM/DD/YYYY HH:MM:ss]');
  const componentPart = chalk.black.bgWhite(` ${component} `);
  const subDetailPart = detail ? ` ${chalk.magenta(detail)}` : '';
  const contextPart = createContextString(guild, channel, user);
  const messagePart = message ? ` ${message.content}` : '';
  const eventNamePart = eventName ? ` ${eventName}` : '';
  return `${timeStamp} ${header}${componentPart}${eventNamePart}${contextPart}${messagePart}${subDetailPart}`;
}

function log(component, header, info, logToStderr, errToStderr) {
  const coercedInfo = {};
  if (typeof info === 'object') {
    Object.assign(coercedInfo, info);
  } else if (typeof info === 'string' || typeof info === 'number' || typeof info === 'boolean') {
    coercedInfo.msg = info.toString();
  } else {
    throw new Error(`Invalid log input: ${info}`);
  }

  const printLog = logToStderr ? console.warn : console.log;
  const printError = errToStderr ? console.warn : console.log;

  const {
    event, msg, guild, channel, user, message, err,
  } = coercedInfo;

  printLog(buildLogString(header, event, msg, component, guild, channel, user, message));
  if (err) {
    printError(err);
  }
}

class ConsoleLogger {
  constructor(component) {
    this.component = component;
  }

  fatal(info) {
    log(this.component, chalk.yellow.bgRed.bold(' FATAL ERROR '), info, true, true);
  }

  error(info) {
    log(this.component, chalk.yellow.bgRed(' ERROR '), info, true, true);
  }

  warn(info) {
    log(this.component, chalk.black.bgYellow(' WARNING '), info, false, false);
  }

  info(info) {
    log(this.component, chalk.white.bgBlue(' INFO '), info, false, false);
  }

  debug(info) {
    log(this.component, chalk.black.bgHex('#DEADED')(' DEBUG '), info, false, false);
  }

  trace(info) {
    log(this.component, chalk.black.bgHex('#DEADED')(' TRACE '), info, false, false);
  }

  // Function required by implicit interface contract (with bunyan)
  // eslint-disable-next-line class-methods-use-this
  child({ component }) {
    return new ConsoleLogger(component);
  }
}

module.exports = ConsoleLogger;
