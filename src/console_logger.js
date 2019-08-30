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
  const subDetailPart = detail ? ` (${chalk.magenta(detail)})` : '';
  const contextPart = createContextString(guild, channel, user);
  const messagePart = message ? ` ${message.content}` : '';
  return `${timeStamp} ${header}${componentPart} ${chalk.underline(eventName)}${contextPart}${messagePart}${subDetailPart}`;
}

class ConsoleLogger {
  constructor(component) {
    this.component = component;
  }

  fatal({
    event, msg, err, guild, channel, user, message,
  }) {
    console.warn(buildLogString(chalk.yellow.bgRed.bold(' FATAL ERROR '), event, msg, this.component, guild, channel, user, message));
    if (err) {
      console.warn(err);
    }
  }

  error({
    event, msg, err, guild, channel, user, message,
  }) {
    console.warn(buildLogString(chalk.yellow.bgRed(' ERROR '), event, msg, this.component, guild, channel, user, message));
    if (err) {
      console.warn(err);
    }
  }

  warn({
    event, msg, err, guild, channel, user, message,
  }) {
    console.log(buildLogString(chalk.black.bgYellow(' WARNING '), event, msg, this.component, guild, channel, user, message));
    if (err) {
      console.warn(err);
    }
  }

  info({
    event, msg, err, guild, channel, user, message,
  }) {
    console.log(buildLogString(chalk.white.bgBlue(' INFO '), event, msg, this.component, guild, channel, user, message));
    if (err) {
      console.warn(err);
    }
  }

  debug({
    event, msg, err, guild, channel, user, message,
  }) {
    console.log(buildLogString(chalk.black.bgWhite(' DEBUG '), event, msg, this.component, guild, channel, user, message));
    if (err) {
      console.warn(err);
    }
  }

  trace({
    event, msg, err, guild, channel, user, message,
  }) {
    console.log(buildLogString(chalk.black.bgWhite(' TRACE '), event, msg, this.component, guild, channel, user, message));
    if (err) {
      console.warn(err);
    }
  }

  // Function required by implicit interface contract (with bunyan)
  // eslint-disable-next-line class-methods-use-this
  child({ component }) {
    return new ConsoleLogger(component);
  }
}

module.exports = ConsoleLogger;
