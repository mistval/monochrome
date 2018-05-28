'use strict'
const reload = require('require-reload')(require);
const Eris = require('eris');
const request = require('request-promise');
const Logger = require('./logger.js');
const Persistence = require('./persistence.js');
const NavigationManager = require('./navigation_manager.js');
const replyDeleter = require('./reply_deleter.js');

const LOGGER_TITLE = 'CORE';
const UPDATE_STATS_INTERVAL_IN_MS = 7200000; // 2 hours
const UPDATE_STATS_INITIAL_DELAY_IN_MS = 60000; // 1 minute
const USER_MENTION_REPLACE_REGEX = /<@user>/g;
const USER_NAME_REPLACE_REGEX = /<user>/g;

function sanitizeAndValidateConfiguration(config, logger) {
  // For backwards compatibility with v1.1
  if (config.serverSettingsCommandAliases) {
    config.settingsCommandAliases = config.serverSettingsCommandAliases;
    delete config.serverSettingsCommandAliases;
  }

  let errorMessage;
  if (!config.botToken) {
    errorMessage = 'Invalid botToken value in configuration (should be non-empty string)';
  } else if (typeof config.serverAdminRoleName !== typeof '') {
    errorMessage = 'Invalid serverAdminRoleName value in configuration (should be string, use empty string for no server entry message)';
  } else if (!config.botAdminIds || !Array.isArray(config.botAdminIds)) {
    errorMessage = 'Invalid botAdminIds value in configuration (should be array of strings)';
  } else if (typeof config.genericErrorMessage !== typeof '') {
    errorMessage = 'Invalid genericErrorMessage value in configuration (should be string, use empty string for no error message)';
  } else if (typeof config.genericDMReply !== typeof '') {
    errorMessage = 'Invalid genericDMReply value in configuration (should be string, use empty string for no DM reply message)';
  } else if (typeof config.genericMentionReply !== typeof '') {
    errorMessage = 'Invalid genericMentionReply value in configuration (should be string, use empty string for no reply message)';
  } else if (typeof config.discordBotsDotOrgAPIKey !== typeof '') {
    errorMessage = 'Invalid discordBotsDotOrgAPIKey value in configuration (should be string, use empty string for no key)';
  } else if (typeof config.useANSIColorsInLogFiles !== typeof true) {
    errorMessage = 'Invalid useANSIColorsInLogFiles value in configuration (should be boolean)';
  } else if (!config.statusRotation || !Array.isArray(config.statusRotation)) {
    errorMessage = 'Invalid statusRotation value in configuration (should be array, use empty array for no status. 1 value array for no rotation.)';
  } else if (typeof config.statusRotationIntervalInSeconds !== typeof 2) {
    errorMessage = 'Invalid statusRotationIntervalInSeconds value in configuration (should be a number of seconds (not a string))';
  } else if (config.botAdminIds.some(id => typeof id !== typeof '')) {
    errorMessage = 'Invalid botAdminId in configuration (should be a string (not a number! put quotes around it))';
  } else if (config.statusRotation.some(status => typeof status !== typeof '')) {
    errorMessage = 'Invalid status in configuration (should be a string)';
  } else if (!config.settingsCommandAliases || config.settingsCommandAliases.some(alias => typeof alias !== typeof '')) {
    errorMessage = 'Invalid settingsCommandAliases in configuration (should be an array of strings)';
  } else if (!config.commandsToGenerateHelpFor || !Array.isArray(config.commandsToGenerateHelpFor)) {
    errorMessage = 'Invalid commandsToGenerateHelpFor in configuration (must be an array, can be empty for no auto-generated help)';
  } else if (!config.autoGeneratedHelpCommandAliases || !Array.isArray(config.autoGeneratedHelpCommandAliases)) {
    errorMessage = 'Invalid autoGeneratedHelpCommandAliases in configuration (must be an array, can be empty)';
  } else if (!config.colorForAutoGeneratedHelpEmbeds || typeof config.colorForAutoGeneratedHelpEmbeds !== typeof 1) {
    errorMessage = 'Invalid colorForAutoGeneratedHelpEmbeds in configuration. It must be an integer.';
  }

  if (errorMessage) {
    logger.logFailure('CONFIG', errorMessage);
    throw new Error(errorMessage);
  }
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
    uri: 'https://discordbots.org/api/bots/' + bot.user.id + '/stats',
    body: '{"server_count": ' + bot.guilds.size.toString() + '}',
    method: 'POST',
  }).then(() => {
    logger.logSuccess(LOGGER_TITLE, 'Sent stats to discordbots.org: ' + bot.guilds.size.toString() + ' servers.');
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
    uri: 'https://bots.discord.pw/api/bots/' + bot.user.id + '/stats',
    body: '{"server_count": ' + bot.guilds.size.toString() + '}',
    method: 'POST',
  }).then(() => {
    logger.logSuccess(LOGGER_TITLE, 'Sent stats to bots.discord.pw: ' + bot.guilds.size.toString() + ' servers.');
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
    return guild.name + ' owned by ' + owner.username + '#' + owner.discriminator;
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Couldn\'t create join/leave guild log string', err);
    return '<Error getting guild name or owner name>';
  }
}

function stringContainsInviteLink(str) {
  return str.indexOf('discord.gg') !== -1;
}

function validateOptions(options) {
  let errorMessage = '';
  if (!options || typeof options !== 'object') {
    throw new Error('Either nothing was passed to the Monochrome bot constructor, or something was but it\'s not an object. The interface changed since version 1.1. Please review the readme.');
  } else if (!options.configFilePath) {
    throw new Error('No configuration file path specified');
  } else if (!options.commandsDirectoryPath) {
    throw new Error('No commands directory path specified (it can be an empty directory, but must exist)');
  } else if (!options.messageProcessorsDirectoryPath) {
    throw new Error('No message processor directory path specified (it can be an empty directory, but must exist)');
  }
}

class Monochrome {
  constructor(options) {
    validateOptions(options);

    const {
      configFilePath,
      commandsDirectoryPath,
      messageProcessorsDirectoryPath,
      settingsFilePath,
      logDirectoryPath,
      extensionsDirectoryPath,
      onShutdown,
    } = options;

    this.configFilePath_ = configFilePath;
    this.commandsDirectoryPath_ = commandsDirectoryPath;
    this.messageProcessorsDirectoryPath_ = messageProcessorsDirectoryPath;
    this.settingsFilePath_ = settingsFilePath;
    this.extensionsDirectoryPath_ = extensionsDirectoryPath;
    this.onShutdown_ = onShutdown || (() => {});
    this.logger_ = new Logger();

    this.botMentionString_ = '';
    this.config_ = reload(this.configFilePath_);
    this.persistence_ = new Persistence(undefined, this.config_);
    this.logger_.initialize(logDirectoryPath, this.config_.useANSIColorsInLogFiles);
    sanitizeAndValidateConfiguration(this.config_, this.logger_);
    this.bot_ = new Eris(this.config_.botToken, this.config_.erisOptions);
    replyDeleter.initialize(Eris);
    this.navigationManager_ = new NavigationManager(this.logger_);
    this.reloadCore_();
  }

  getErisBot() {
    return this.bot_;
  }

  getLogger() {
    return this.logger_;
  }

  getNavigationManager() {
    return this.navigationManager_;
  }

  getPersistence() {
    return this.persistence_;
  }

  getSettings() {
    return this.settings_;
  }

  getConfig() {
    return this.config_;
  }

  getCommandManager() {
    return this.commandManager_;
  }

  connect() {
    if (this.connected_) {
      return;
    }
    this.connected_ = true;
    this.bot_.on('ready', () => {
      this.ready_ = true;
      this.loadExtensions_();
      this.logger_.logSuccess(LOGGER_TITLE, 'Bot ready.');
      this.botMentionString_ = '<@' + this.bot_.user.id + '>';
      this.rotateStatuses_();
      this.startUpdateStatsInterval_();
    });

    this.bot_.on('messageCreate', msg => {
      this.onMessageCreate_(msg);
    });

    this.bot_.on('guildCreate', guild => {
      this.logger_.logSuccess('JOINED GUILD', createGuildLeaveJoinLogString(guild, this.logger_));
    });

    this.bot_.on('error', (err, shardId) => {
      let errorMessage = 'Error';
      if (shardId) {
        errorMessage += ' on shard ' + shardId;
      }
      this.logger_.logFailure(LOGGER_TITLE, errorMessage, err);
    });

    this.bot_.on('disconnect', () => {
      this.logger_.logFailure(LOGGER_TITLE, 'All shards disconnected');
    });

    this.bot_.on('shardDisconnect', (err, id) => {
      this.logger_.logFailure(LOGGER_TITLE, 'Shard ' + id + ' disconnected', err);
    });

    this.bot_.on('shardResume', id => {
      this.logger_.logSuccess(LOGGER_TITLE, 'Shard ' + id + ' reconnected');
    });

    this.bot_.on('warn', message => {
      this.logger_.logFailure(LOGGER_TITLE, 'Warning: ' + message);
    });

    this.bot_.on('shardReady', id => {
      this.logger_.logSuccess(LOGGER_TITLE, 'Shard ' + id + ' connected');
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
    });

    this.bot_.connect().catch(err => {
      this.logger_.logFailure(LOGGER_TITLE, 'Error logging in', err);
    });
  }

  loadExtensions_() {
    if (this.extensionsDirectoryPath_) {
      this.extensionManager_ = new (reload('./extension_manager.js'))();
      this.extensionManager_.load(this.extensionsDirectoryPath_, this);
    }
  }

  onMessageCreate_(msg) {
    try {
      if (!this.ready_) {
        return;
      }
      if (!msg.author) {
        return; // Sometimes an empty message with no author appears. *shrug*
      }
      if (msg.author.bot) {
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
      this.logger_.logFailure(LOGGER_TITLE, 'Error caught at top level', err);
      if (this.config_.genericErrorMessage) {
        msg.channel.createMessage(this.config_.genericErrorMessage);
      }
    }
  }

  reloadCore_() {
    this.config_ = reload(this.configFilePath_);
    sanitizeAndValidateConfiguration(this.config_);
    this.logger_.reload();
    this.navigationManager_.reload();

    const MessageProcessorManager = reload('./message_processor_manager.js');
    const Settings = reload('./settings.js');
    const CommandManager = reload('./command_manager.js');
    const RepeatingQueue = reload('./repeating_queue.js');

    this.statusQueue_ = new RepeatingQueue(this.config_.statusRotation);
    this.messageProcessorManager_ = new MessageProcessorManager(this.logger_);
    this.settings_ = new Settings(this.persistence_, this.logger_, this.settingsFilePath_);
    this.commandManager_ = new CommandManager(
      () => this.reloadCore_(),
      () => this.shutdown_(),
      this.logger_,
      this.config_,
      this.settings_,
    );

    this.commandManager_.load(this.commandsDirectoryPath_, this);
    this.messageProcessorManager_.load(this.messageProcessorsDirectoryPath_, this);

    if (this.ready_) {
      this.loadExtensions_();
    }
  }

  shutdown_() {
    this.logger_.logSuccess(LOGGER_TITLE, 'Shutting down.');
    try {
      Promise.resolve(this.onShutdown_(this.bot_)).catch(err => {
        this.logger_.logFailure(LOGGER_TITLE, 'The promise returned from a custom onShutdown handler rejected. Continuing shutdown.', err);
      }).then(() => {
        this.bot_.disconnect();
        process.exit();
      });
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'The custom onShutdown handler threw. Continuing shutdown.', err);
      this.bot_.disconnect();
      process.exit();
    }
  }

  startUpdateStatsInterval_() {
    if (this.updateStatsTimeoutHandle_) {
      return;
    }
    if (this.config_.discordBotsDotOrgAPIKey || this.config_.botsDotDiscordDotPwAPIKey) {
      this.updateStatsTimeoutHandle_ = setTimeout(() => {
        updateStats(this.config_, this.bot_, this.logger_);
        this.updateStatsTimeoutHandle_ = setInterval(updateStats, UPDATE_STATS_INTERVAL_IN_MS, this.config_, this.bot_, this.logger_);
      }, UPDATE_STATS_INITIAL_DELAY_IN_MS);
    }
  }

  rotateStatuses_() {
    try {
      if (this.rotateStatusesTimeoutHandle_) {
        clearTimeout(this.rotateStatusesTimeoutHandle_);
      }
      if (this.config_.statusRotation.length > 0) {
        if (this.config_.statusRotation.length > 1) {
          this.rotateStatusesTimeoutHandle_ = setTimeout(() => this.rotateStatuses_(), this.config_.statusRotationIntervalInSeconds * 1000);
        }

        let nextStatus = this.statusQueue_.pop();
        this.bot_.editStatus({name: nextStatus});
      }
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error rotating statuses', err);
    }
  }

  sendDmOrMentionReply_(toMsg, replyTemplate) {
    toMsg.channel.createMessage(this.createDMOrMentionReply_(replyTemplate, toMsg)).catch(err => {
      this.logger_.logFailure(LOGGER_TITLE, 'Error sending reply to DM or message', err);
    });
  }

  tryHandleDm_(msg) {
    try {
      if (!msg.channel.guild) {
        this.logger_.logInputReaction('DIRECT MESSAGE', msg, '', true);
        if (this.config_.inviteLinkDmReply && stringContainsInviteLink(msg.content)) {
          this.sendDmOrMentionReply_(msg, this.config_.inviteLinkDmReply);
        } else if (this.config_.genericDMReply) {
          this.sendDmOrMentionReply_(msg, this.config_.genericDMReply);
        }
        return true;
      }
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Error handling DM', err);
    }

    return false;
  }

  tryHandleMention_(msg) {
    try {
      if (msg.mentions.length > 0 && msg.content.indexOf(this.botMentionString_) === 0 && this.config_.genericMentionReply) {
        this.sendDmOrMentionReply_(msg, this.config_.genericMentionReply);
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
      let reply = configReply.replace(USER_MENTION_REPLACE_REGEX, '<@' + msg.author.id + '>');
      reply = reply.replace(USER_NAME_REPLACE_REGEX, msg.author.username);
      return reply;
    } catch (err) {
      this.logger_.logFailure(LOGGER_TITLE, 'Couldn\'t create DM or mention reply', err);
      return this.config_.genericErrorMessage;
    }
  }
}

module.exports = Monochrome;
