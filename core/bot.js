const reload = require('require-reload')(require);
const Eris = require('eris');
const request = require('request-promise');
const Logger = require('./logger.js');
const Persistence = require('./persistence.js');
const NavigationManager = require('./navigation_manager.js');
const replyDeleter = require('./reply_deleter.js');
const constants = require('./constants.js');
const Blacklist = require('./blacklist.js');
const MessageProcessorManager = require('./message_processor_manager.js');
const Settings = require('./settings.js');
const CommandManager = require('./command_manager.js');
const assert = require('assert');

const LOGGER_TITLE = 'CORE';
const UPDATE_STATS_INTERVAL_IN_MS = 7200000; // 2 hours
const UPDATE_STATS_INITIAL_DELAY_IN_MS = 60000; // 1 minute
const USER_MENTION_REPLACE_REGEX = /<@user>/g;
const USER_NAME_REPLACE_REGEX = /<user>/g;

function updateStatusFromQueue(bot, queue) {
  let nextStatus = queue.shift();
  bot.editStatus({name: nextStatus});
  queue.push(nextStatus);
}

function updateDiscordBotsDotOrg(config, bot, logger) {
  if (!config.discordBotsDotOrgAPIKey) {
    return;
  }
  request({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.discordBotsDotOrgAPIKey,
      'Accept': 'application/json',
    },
    uri: `https://discordbots.org/api/bots/${bot.user.id}/stats`,
    body: `{"server_count": ${bot.guilds.size.toString()}}`,
    method: 'POST',
  }).then(() => {
    logger.logSuccess(LOGGER_TITLE, `Sent stats to discordbots.org: ${bot.guilds.size.toString()} servers.`);
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Error sending stats to discordbots.org', err);
  });
}

function updateBotsDotDiscordDotPw(config, bot, logger) {
  if (!config.botsDotDiscordDotPwAPIKey) {
    return;
  }
  request({
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.botsDotDiscordDotPwAPIKey,
      'Accept': 'application/json',
    },
    uri: `https://bots.discord.pw/api/bots/${bot.user.id}/stats`,
    body: `{"server_count": ${bot.guilds.size.toString()}}`,
    method: 'POST',
  }).then(() => {
    logger.logSuccess(LOGGER_TITLE, `Sent stats to bots.discord.pw: ${bot.guilds.size.toString()} servers.`);
  }).catch(err => {
    logger.logFailure(LOGGER_TITLE, 'Error sending stats to bots.discord.pw', err);
  });
}

function updateStats(config, bot, logger) {
  updateBotsDotDiscordDotPw(config, bot, logger);
  updateDiscordBotsDotOrg(config, bot, logger);
}

function createGuildLeaveJoinLogString(guild, logger) {
  try {
    let owner = guild.members.get(guild.ownerID).user;
    return `${guild.name} owned by ${owner.username}#${owner.discriminator}`;
  } catch (err) {
    // Sometimes this happens because the owner isn't cached or something.
    logger.logFailure(LOGGER_TITLE, 'Couldn\'t create join/leave guild log string', err);
    return '<Error getting guild name or owner name>';
  }
}

function stringContainsInviteLink(str) {
  return str.indexOf('discord.gg') !== -1;
}

function validateAndSanitizeOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('Either nothing was passed to the Monochrome bot constructor, or something was but it\'s not an object. The interface changed since version 1.1. Please review the readme.');
  }

  if (!options.botToken) {
    throw new Error('No botToken specified');
  }

  if (options.statusRotation) {
    if (!Array.isArray(options.statusRotation)) {
      throw new Error('If provided, statusRotation must be an array');
    }
    if (!options.statusRotationIntervalInSeconds && options.statusRotation.length > 1) {
      throw new Error('If statusRotation is provided and has more than one status, statusRotationIntervalInSeconds must also be provided');
    }
  } else {
    options.statusRotation = [];
  }

  if (options.botAdminIds && !Array.isArray(options.botAdminIds)) {
    options.botAdminIds = [options.botAdminIds];
  }
  if (!options.botAdminIds) {
    options.botAdminIds = [];
  }

  if (options.prefixes && !Array.isArray(options.prefixes)) {
    options.prefixes = [options.prefixes];
  }
  if (!options.prefixes || !options.prefixes[0]) {
    options.prefixes = [''];
  }

  if (typeof options.useANSIColorsInLogFiles !== 'boolean') {
    options.useANSIColorsInLogFiles = true;
  }

  if (options.ignoreOtherBots === undefined) {
    options.ignoreOtherBots = true;
  }

  return options;
}

 /**
  * The Eris Client object that monochrome is built on top of.
  * @external "Eris.Client"
  * @see {@link https://abal.moe/Eris/docs/Client}
  */

/**
 * Represents a message received from the Discord API.
 * @external "Eris.Message"
 * @see {@link https://abal.moe/Eris/docs/Message}
 */

/**
 * Represents a channel in a Discord server. Usually you would get this from the
 * .channel property on {@link external:"Eris.Message"}.
 * @external "Eris.TextChannel"
 * @see {@link https://abal.moe/Eris/docs/TextChannel}
 */

/**
 * The main entry point into the framework. You construct this and call connect()
 * on it to start your bot.
 * See the [monochrome demo]{@link https://github.com/mistval/monochrome-demo/blob/master/bot.js}
 * for a full working example bot.
 @example
const Monochrome = require('monochrome-bot');
const path = require('path');

const bot = new Monochrome({
  botToken: require('./my-gitignored-config-file.json').myBotToken,
  botAdminIds: ['my_user_id'],
  prefixes: ['!', '@'],
  commandsDirectoryPath: path.join(__dirname, 'commands'),
  messageProcessorsDirectoryPath: path.join(__dirname, 'message_processors'),
  logDirectoryPath: path.join(__dirname, 'logs'),
  persistenceDirectoryPath: path.join(__dirname, 'persistence')
  settingsFilePath: path.join(__dirname, 'settings.js'),
  useANSIColorsInLogFiles: true,
  genericErrorMessage: 'Sorry, there was an error with that command. It has been logged and will be addressed.',
  missingPermissionsErrorMessage: 'I do not have permission to reply to that command in this channel.',
  genericDMReply: 'Say **<prefix>help** to see my commands!',
  genericMentionReply: 'Hi <@user>, say **<prefix>help** to see my commands!',
  inviteLinkDmReply: 'You can invite me to your server with this link! https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot',
  statusRotation: ['cooking dinner', 'eating dinner', 'cleaning kitchen'],
  statusRotationIntervalInSeconds: 600,
  discordBotsDotOrgAPIKey: require('./my-gitignored-config-file.json').myDiscordBotsDotOrgAPIkey,
  botsDotDiscordDotPwAPIKey: require('./my-gitignored-config-file.json').myBotDotDiscordDotPwAPIKey,
  erisOptions: { maxShards: 'auto' },
});

bot.connect();
 */
class Monochrome {
  /**
   * @param {Object} options - Options to customize bot behavior.
   * @param {string} options.botToken - Your bot's token.
   * @param {string[]} [options.botAdminIds=[]] - A list of IDs of users who are allowed to run bot admin commands.
   * @param {string[]} [options.prefixes=['']] - The bot's default command prefixes.
   * @param {string} [options.commandsDirectoryPath] - The path of the directory (must exist) where your command modules exist. If this is omitted, no commands with be loaded.
   * @param {string} [options.messageProcessorsDirectoryPath] - The path of the directory (must exist) where your message processor modules exist. If this is omitted, no message processors will be loaded.
   * @param {string} [options.logDirectoryPath] - The path of the directory where logs should be stored (does not need to exist, but parent directories must exist). If this is omitted, logs will not be saved to disk.
   * @param {string} [options.persistenceDirectoryPath=process.cwd()] - The path of the directory where persistent data should be stored (does not need to exist, but parent directories must exist).
   * @param {string} [options.settingsFilePath] - The path of the Javascript file in which an array of your settings definitions exists. If this is omitted, no settings will be loaded.
   * @param {boolean} [options.useANSIColorsInLogFiles=true] - Whether log files should contain the ANSI color codes that make the console output pretty.
   * @param {string} [options.genericErrorMessage] - If your code throws an error that is caught by monochrome, this message will be sent to the channel where the command was used. The exception is message processors. Errors caught from message processors will not be broadcast to the channel. This avoids the possibility of your message processor throwing on any input and spamming errors to the channel.
   * @param {string} [options.missingPermissionsErrorMessage] - If the bot fails to send a message due to missing permissions, the bot will attempt to send this message to the channel (that may fail too, if the bot has no permission to send even plain text messages in the channel). If this is omitted, no message is sent to the channel.
   * @param {string} [options.genericDMReply] - If a user messages the bot, and that message is not processed by other code (commands, etc) the bot will send this response. If this is omitted, no message is sent.
   * @param {string} [options.genericMentionReply] - If a user mentions the bot and the mention is the first thing in the message, the bot will respond with this message. If this is omitted, no message is sent.
   * @param {string} [options.inviteLinkDmReply] - If a user DMs the bot a server invite link, the bot will reply with this message. Sometimes users DM bots with invite links to try to add the bot to a server. So you can use this to have your bot reply with the bot invite link and instructions for adding the bot to a server. If this is omitted, no message is sent.
   * @param {string[]} [options.statusRotation=[]] - An array of statuses that the bot should rotate through. The statusRotationIntervalInSeconds property is required to be set if this property is set.
   * @param {number} [options.statusRotationIntervalInSeconds] - The bot will change their status on this interval (if the statusRotation has more than one status).
   * @param {string} [options.discordBotsDotOrgAPIKey] - If you have an API key from {@link https://discordbots.org/} you can provide it here and your server count will be sent regularly.
   * @param {string} [options.botsDotDiscordDotPwAPIKey] - If you have an API key from {@link https://bots.discord.pw/} you can provide it here and your server count will be sent regularly.
   * @param {Object} [options.erisOptions] - The options to pass directly to the Eris client. You can do things like set your shard count here. See the 'options' constructor parameter here: {@link https://abal.moe/Eris/docs/Client}
   */
  constructor(options) {
    this.options_ = validateAndSanitizeOptions(options, this.logger_);

    this.bot_ = new Eris(this.options_.botToken, this.options_.erisOptions);
    this.logger_ = new Logger(this.options_.logDirectoryPath, this.options_.useANSIColorsInLogFiles);
    this.persistence_ = new Persistence(this.options_.prefixes, this.logger_, this.options_.persistenceDirectoryPath);
    this.blacklist_ = new Blacklist(this.bot_, this.persistence_, this.options_.botAdminIds);
    replyDeleter.initialize(Eris);
    this.navigationManager_ = new NavigationManager(this.logger_);

    this.reload();
  }

  /**
   * Get the Eris client object.
   * You can subscribe to events on the client, use it to lookup users, etc.
   * @returns {external:"Eris.Client"}
   * @see {@link https://abal.moe/Eris/docs/Client}
   */
  getErisBot() {
    assert(this.bot_, 'The bot object is not available (probably a bug in monochrome)');
    return this.bot_;
  }

  /**
   * Get the Logger, which you can use to log messages.
   * @returns {Logger}
   */
  getLogger() {
    assert(this.logger_, 'Logger not available (probably a bug in monochrome)');
    return this.logger_;
  }

  /**
   * Get the NavigationManager, with which you can send navigations.
   * @returns {NavigationManager}
   */
  getNavigationManager() {
    assert(this.navigationManager_, 'NavigationManager not available (probably a bug in monochrome)');
    return this.navigationManager_;
  }

  /**
   * Get the Persistence object, with which you can read and store persistent data.
   * @returns {Persistence}
   */
  getPersistence() {
    assert(this.persistence_, 'Persistence not available (probably a bug in monochrome)');
    return this.persistence_;
  }

  /**
   * Get the Blacklist, which you can use to blacklist users and manage blacklisted users.
   * @returns {Blacklist}
   */
  getBlacklist() {
    assert(this.blacklist_, 'Blacklist not available (probably a bug in monochrome)');
    return this.blacklist_;
  }

  /**
   * Get the Settings object, with which you can read and store persistent settings.
   * @returns {Settings}
   */
  getSettings() {
    assert(this.settings_, 'Settings not available (probably a bug in monochrome)');
    return this.settings_;
  }

  getSettingsIconUri() {
    return this.options_.settingsIconUri;
  }

  getBotAdminIds() {
    return this.options_.botAdminIds;
  }

  getGenericErrorMessage() {
    return this.options_.genericErrorMessage;
  }

  getMissingPermissionsErrorMessage() {
    return this.options_.missingPermissionsErrorMessage;
  }

  /**
   * Get the CommandManager.
   * @returns {CommandManager}
   */
  getCommandManager() {
    assert(this.commandManager_, 'Command manager not available (probably a bug in monochrome)');
    return this.commandManager_;
  }

  /**
   * Reload your commands, message processors, and settings. You can use this
   * to add, remove, and edit commands and other code, without having to restart
   * your bot.
   */
  reload() {
    this.settings_ = new Settings(this.persistence_, this.logger_, this.options_.settingsFilePath);
    this.commandManager_ = new CommandManager(this.options_.commandsDirectoryPath, this.options_.prefixes, this);
    this.commandManager_.load();
    this.messageProcessorManager_ = new MessageProcessorManager(this.options_.messageProcessorsDirectoryPath, this);
    this.messageProcessorManager_.load();
  }

  /**
   * Check if the sender of a message is a server admin (or bot admin).
   * @param {external:"Eris.Message"} - The Eris message. {@link https://abal.moe/Eris/docs/Message}
   * @returns {boolean}
   */
  userIsServerAdmin(msg) {
    if (!msg.channel.guild) {
      return true;
    }

    if (!msg.member) {
      return false;
    }

    let permission = msg.member.permission.json;
    if (permission.manageGuild || permission.administrator || permission.manageChannels) {
      return true;
    }

    if (this.options_.botAdminIds.indexOf(msg.author.id) !== -1) {
      return true;
    }

    return false;
  }

  /**
   * Disconnect and stop the bot. Connect() cannot be called again and some operations may fail.
   * You should call this as a final part of preparing to exit the process.
   */
  async stop() {
    this.logger_.logSuccess(LOGGER_TITLE, 'Stopping');
    this.bot_.disconnect();

    try {
      await Promise.all([
        this.persistence_.stop(),
        this.logger_.close(),
      ]);
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error stopping', err);
      throw err;
    }
  }

  /**
   * Connect to Discord and start listening for users to send commands to the bot.
   */
  connect() {
    if (this.connected_) {
      return;
    }

    this.connected_ = true;
    this.bot_.on('ready', () => {
      this.logger_.logSuccess(LOGGER_TITLE, 'Bot ready.');
      this.rotateStatuses_();
      this.startUpdateStatsInterval_();
    });

    this.bot_.on('messageCreate', msg => {
      this.onMessageCreate_(msg);
    });

    this.bot_.on('guildCreate', guild => {
      this.logger_.logSuccess('JOINED GUILD', createGuildLeaveJoinLogString(guild, this.logger_));
      this.blacklist_.leaveGuildIfBlacklisted(guild).then((left) => {
        if (left) {
          this.logger_.logFailure(LOGGER_TITLE, 'Left blacklisted guild');
        }
      }).catch(err => {
        this.logger_.logFailure(LOGGER_TITLE, 'Error leaving blacklisted guild', err);
      });
    });

    this.bot_.on('error', (err, shardId) => {
      let errorMessage = 'Error';
      if (shardId) {
        errorMessage += ` on shard ${shardId}`;
      }
      this.logger_.logFailure(LOGGER_TITLE, errorMessage, err);
    });

    this.bot_.on('disconnect', () => {
      this.logger_.logFailure(LOGGER_TITLE, 'All shards disconnected');
    });

    this.bot_.on('shardDisconnect', (err, id) => {
      this.logger_.logFailure(LOGGER_TITLE, `Shard ${id} disconnected`, err);
    });

    this.bot_.on('shardResume', id => {
      this.logger_.logSuccess(LOGGER_TITLE, `Shard ${id} reconnected`);
    });

    this.bot_.on('warn', message => {
      this.logger_.logFailure(LOGGER_TITLE, `Warning: ${message}`);
    });

    this.bot_.on('shardReady', id => {
      this.logger_.logSuccess(LOGGER_TITLE, `Shard ${id} connected`);
    });

    this.bot_.on('messageReactionAdd', (msg, emoji, userId) => {
      this.navigationManager_.handleEmojiToggled(this.bot_, msg, emoji, userId);
      replyDeleter.handleReaction(msg, userId, emoji);
    });

    this.bot_.on('messageDelete', msg => {
      replyDeleter.handleMessageDeleted(msg);
    });

    this.bot_.on('messageReactionRemove', (msg, emoji, userId) => {
      this.navigationManager_.handleEmojiToggled(this.bot_, msg, emoji, userId);
    });

    this.bot_.on('guildDelete', (guild, unavailable) => {
      if (!unavailable) {
        this.logger_.logFailure('LEFT GUILD', createGuildLeaveJoinLogString(guild, this.logger_));
      }
      this.persistence_.resetPrefixesForServerId(guild.id).then(() => {
        this.logger_.logSuccess('RESET PREFIXES', `for ${guild.name}`);
      }).catch(err => {
        this.logger_.logFailure('RESET PREFIXES', `for ${guild.name}`, err);
      });
    });

    this.bot_.connect().catch(err => {
      this.logger_.logFailure(LOGGER_TITLE, 'Error logging in', err);
    });
  }

  onMessageCreate_(msg) {
    try {
      if (msg.author.bot && this.options_.ignoreOtherBots) {
        return;
      }
      if (this.blacklist_.isUserBlacklistedQuick(msg.author.id)) {
        return;
      }
      if (this.commandManager_.processInput(this.bot_, msg)) {
        return;
      }
      if (this.messageProcessorManager_.processInput(this.bot_, msg)) {
        return;
      }
      if (this.tryHandleDm_(msg)) {
        return;
      }
      if (this.tryHandleMention_(msg)) {
        return;
      }
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error caught at top level (probably a bug in monochrome)', err);
      if (this.options_.genericErrorMessage) {
        msg.channel.createMessage(this.options_.genericErrorMessage).catch(err => {
          this.logger_.logFailure(LOGGER_TITLE, 'Error sending error message', err);
        });
      }
    }
  }

  startUpdateStatsInterval_() {
    if (this.updateStatsTimeoutHandle_) {
      return;
    }
    if (this.options_.discordBotsDotOrgAPIKey || this.options_.botsDotDiscordDotPwAPIKey) {
      this.updateStatsTimeoutHandle_ = setTimeout(() => {
        updateStats(this.options_, this.bot_, this.logger_);
        this.updateStatsTimeoutHandle_ = setInterval(updateStats, UPDATE_STATS_INTERVAL_IN_MS, this.options_, this.bot_, this.logger_);
      }, UPDATE_STATS_INITIAL_DELAY_IN_MS);
    }
  }

  rotateStatuses_() {
    let statusRotation = this.options_.statusRotation;
    if (statusRotation.length === 0) {
      return;
    }

    updateStatusFromQueue(this.bot_, statusRotation);

    if (statusRotation.length > 1) {
      let intervalInMs = this.options_.statusRotationIntervalInSeconds * 1000;
      setInterval(() => {
        try {
          updateStatusFromQueue(this.bot_, statusRotation);
        } catch (err) {
          this.logger_.logFailure(LOGGER_TITLE, 'Error rotating statuses', err);
        }
      }, intervalInMs);
    }
  }

  sendDmOrMentionReply_(toMsg, replyTemplate) {
    return toMsg.channel.createMessage(this.createDMOrMentionReply_(replyTemplate, toMsg)).catch(err => {
      this.logger_.logFailure(LOGGER_TITLE, 'Error sending reply to DM or message', err);
    });
  }

  tryHandleDm_(msg) {
    try {
      if (!msg.channel.guild) {
        this.logger_.logInputReaction('DIRECT MESSAGE', msg, '', true);
        if (this.options_.inviteLinkDmReply && stringContainsInviteLink(msg.content)) {
          this.sendDmOrMentionReply_(msg, this.options_.inviteLinkDmReply);
        } else if (this.options_.genericDMReply) {
          this.sendDmOrMentionReply_(msg, this.options_.genericDMReply);
        }
        return true;
      }
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error handling DM', err);
    }

    return false;
  }

  tryHandleMention_(msg) {
    if (!this.bot_.user) {
      return;
    }

    try {
      if (msg.mentions.length > 0 && msg.content.indexOf(this.bot_.user.mention) === 0 && this.options_.genericMentionReply) {
        this.sendDmOrMentionReply_(msg, this.options_.genericMentionReply);
        this.logger_.logInputReaction('MENTION', msg, '', true);
        return true;
      }
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error handling mention', err);
    }

    return false;
  }

  createDMOrMentionReply_(configReply, msg) {
    try {
      let reply = configReply.replace(USER_MENTION_REPLACE_REGEX, msg.author.mention);
      reply = reply.replace(USER_NAME_REPLACE_REGEX, msg.author.username);
      const prefix = this.persistence_.getPrimaryPrefixForMessage(msg);
      reply = reply.replace(constants.PREFIX_REPLACE_REGEX, prefix);
      return reply;
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Couldn\'t create DM or mention reply', err);
      return this.options_.genericErrorMessage;
    }
  }
}

module.exports = Monochrome;
