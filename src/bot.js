const { Client: DysnomiaClient} = require('@projectdysnomia/dysnomia');
const Persistence = require('./persistence.js');
const replyDeleter = require('./reply_deleter.js');
const Blacklist = require('./blacklist.js');
const MessageProcessorManager = require('./message_processor_manager.js');
const Settings = require('./settings.js');
const CommandManager = require('./command_manager.js');
const assert = require('assert');
const onExit = require('async-on-exit');
const TrackerStatsUpdater = require('./tracker_stats_updater.js');
const ConsoleLogger = require('./console_logger.js');
const loggerSerializers = require('./logger_serializers.js');
const FPersistPlugin = require('./storage_fpersist.js');
const path = require('path');
const RESTUserUpdater = require('./rest_updaters/update_user.js');
const { PaginatedMessageStaticEvents } = require('./components/paginated_message.js');
const { InteractiveMessage } = require('./components/interactive_message.js');

function updateStatusFromQueue(bot, queue) {
  let nextStatus = queue.shift();
  bot.editStatus({name: nextStatus});
  queue.push(nextStatus);
}

function validateAndSanitizeOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('Either nothing was passed to the Monochrome bot constructor, or something was but it\'s not an object. The interface changed since version 1.1. Please review the readme.');
  }

  if (!options.botToken) {
    throw new Error('No botToken specified');
  }

  if (typeof options.updateUserFromRestBucketClearInterval !== 'number') {
    options.updateUserFromRestBucketClearInterval = 0;
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

  if (options.ignoreOtherBots === undefined) {
    options.ignoreOtherBots = true;
  }

  if (options.logger === undefined) {
    options.logger = new ConsoleLogger();
  }

  if (options.storage === undefined) {
    options.storage = new FPersistPlugin(path.join(process.cwd(), 'storage'));
  }

  return options;
}

function stopDelay() {
  return new Promise((fulfill) => {
    setTimeout(fulfill, 1000);
  });
}

class MessageWaiter {
  constructor(checkMessage) {
    this.checkMessage = checkMessage;
    this.promise = new Promise((fulfill, reject) => {
      this.fulfill = fulfill;
      this.reject = reject;
    });
  }
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
 * Represents a Discord user.
 * @external "Eris.User"
 * @see {@link https://abal.moe/Eris/docs/User}
 */

/**
 * Represents a channel in a Discord server. Usually you would get this from the
 * .channel property on {@link external:"Eris.Message"}.
 * @external "Eris.TextChannel"
 * @see {@link https://abal.moe/Eris/docs/TextChannel}
 */

/**
 * A logger created with bunyan.createLogger().
 * @external "bunyan.Logger"
 * @see {@link https://www.npmjs.com/package/bunyan#constructor-api}
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
  genericErrorMessage: 'Sorry, there was an error with that command. It has been logged and will be addressed.',
  missingPermissionsErrorMessage: 'I do not have permission to reply to that command in this channel.',
  discordInternalErrorMessage: 'Discord told me something\'s wrong with it. Please try again!',
  statusRotation: ['cooking dinner', 'eating dinner', 'cleaning kitchen'],
  statusRotationIntervalInSeconds: 600,
  topGg: require('./my-gitignored-config-file.json').myTopGgAPIkey,
  discordDotBotsDotGgAPIKey: require('./my-gitignored-config-file.json').myDiscordDotBotsDotGgAPIKey,
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
   * @param {external:"bunyan.Logger"} [options.logger=new Monochrome.ConsoleLogger()] - A bunyan logger, or something with the same interface. Monochrome will use addSerializers to add a 'user', 'guild', and 'channel' serializer to your logger.
   * @param {StoragePlugin} [options.storage=new Monochrome.Plugins.FPersist(path.join(process.cwd(), 'storage'))] - A storage plugin.
   * @param {string} [options.commandsDirectoryPath] - The path of the directory (must exist) where your command modules exist. If this is omitted, no commands with be loaded.
   * @param {string} [options.messageProcessorsDirectoryPath] - The path of the directory (must exist) where your message processor modules exist. If this is omitted, no message processors will be loaded.
   * @param {string} [options.logDirectoryPath] - The path of the directory where logs should be stored (does not need to exist, but parent directories must exist). If this is omitted, logs will not be saved to disk.
   * @param {string} [options.settingsFilePath] - The path of the Javascript file in which an array of your settings definitions exists. If this is omitted, no settings will be loaded.
   * @param {string} [options.genericErrorMessage] - If your code throws an error that is caught by monochrome, this message will be sent to the channel where the command was used. The exception is message processors. Errors caught from message processors will not be broadcast to the channel. This avoids the possibility of your message processor throwing on any input and spamming errors to the channel.
   * @param {string} [options.missingPermissionsErrorMessage] - If the bot fails to send a message due to missing permissions, the bot will attempt to send this message to the channel (that may fail too, if the bot has no permission to send even plain text messages in the channel). If this is omitted, no message is sent to the channel.
   * @param {string} [options.discordInternalErrorMessage] - If the error handler catches a Discord internal error, the user will be shown this message (if Discord succeeds in sending it...). If this is omitted, no message is sent.
   * @param {string[]} [options.statusRotation=[]] - An array of statuses that the bot should rotate through. The statusRotationIntervalInSeconds property is required to be set if this property is set.
   * @param {number} [options.statusRotationIntervalInSeconds] - The bot will change their status on this interval (if the statusRotation has more than one status).
   * @param {string} [options.topGgAPIKey] - If you have an API key from {@link https://top.gg/} you can provide it here and your server count will be sent regularly.
   * @param {string} [options.discordDotBotsDotGgAPIKey] - If you have an API key from {@link https://discord.bots.gg/} you can provide it here and your server count will be sent regularly.
   * @param {string} [options.botsOnDiscordDotXyzAPIKey] - If you have an API key from {@link https://bots.ondiscord.xyz} you can provide it here and your server count will be sent regularly.
   * @param {string} [options.discordBotListDotComAPIKey] - If you have an API key from {@link https://discordbotlist.com} you can provide it here and your server count will be sent regularly.
   * @param {Object} [options.erisOptions] - The options to pass directly to the Eris client. You can do things like set your shard count here. See the 'options' constructor parameter here: {@link https://abal.moe/Eris/docs/Client}
   */
  constructor(options) {
    this.options_ = validateAndSanitizeOptions(options, this.logger);

    this.bot_ = new DysnomiaClient(this.options_.botToken, this.options_.erisOptions);
    this.logger = options.logger;
    this.persistence_ = new Persistence(this.options_.prefixes, this.logger, this.options_.storage);
    this.blacklist_ = new Blacklist(this.bot_, this.persistence_, this.options_.botAdminIds);
    this.restUserUpdater_ = new RESTUserUpdater(options.updateUserFromRestBucketClearInterval);
    this.trackerStatsUpdater = new TrackerStatsUpdater(
      this.bot_,
      this.logger,
      options.topGgApiKey || options.discordBotsDotOrgAPIKey,
      options.discordDotBotsDotGgAPIKey,
      options.botsOnDiscordDotXyzAPIKey,
      options.discordBotListDotComAPIKey,
      options.discordDotBoatsAPIKey,
    );

    if (this.logger.addSerializers) {
      this.logger.addSerializers(loggerSerializers);
    }

    this.coreLogger = this.logger.child({
      component: 'Monochrome::Core',
    });

    this.messageWaiters_ = [];
    this.reload();
    onExit(() => this.stop(), true);
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
   * @returns {external:"bunyan.Logger"}
   */
  getLogger() {
    assert(this.logger, 'Logger not available (probably a bug in monochrome)');
    return this.logger;
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

  getDiscordInternalErrorMessage() {
    return this.options_.discordInternalErrorMessage;
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
    this.settings_ = new Settings(this.persistence_, this.logger, this.options_.settingsFilePath);
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

    let permission = msg.member.permissions.json;
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
    this.coreLogger.info({ event: 'BOT STOPPING' });
    this.bot_.disconnect();

    try {
      await Promise.all([
        this.persistence_.stop(),
      ]);
      await stopDelay();
    } catch (err) {
      this.coreLogger.error({ event: 'ERROR STOPPING BOT', err });
      throw err;
    }
  }

  /**
   * Wait for a message to arrive.
   * @param {Number} timeoutMs - A timeout in milliseconds.
   * @param {Function} messageCheck - A function that takes a message
   *   and returns true if the waitee wants to accept the message.
   *   Accepting the message (returning true) ends the wait.
   *   Returning false continues waiting.
   * @returns {external:"Eris.Message"} The matching message. If none arrives
   *   and the timeout lapses, the promise will reject with a WAITER TIMEOUT
   *   error.
   * @async
   */
  waitForMessage(timeoutMs, messageCheck) {
    const messageWaiter = new MessageWaiter(messageCheck);
    this.messageWaiters_.push(messageWaiter);

    setTimeout(() => {
      const waiterIndex = this.messageWaiters_.indexOf(messageWaiter);
      if (waiterIndex === -1) {
        return;
      }

      const waiter = this.messageWaiters_[waiterIndex];
      this.messageWaiters_.splice(waiterIndex, 1);
      waiter.reject(new Error('WAITER TIMEOUT'));
    }, timeoutMs);

    return messageWaiter.promise;
  }

  /**
   * Fetches a user via the REST API and updates
   * eris' cache with the received user data. This
   * can be helpful for example if you don't have the
   * presence update intent enabled, but you need to
   * have a user's up-to-date username or avatar.
   * @param {String} userId - The ID of the user to fetch.
   * @returns {external:"Eris.User"} - The user's data
   *   (or undefined if the user could not be found either
   *   via the REST API or eris' cache)
   * @async
   */
  async updateUserFromREST(userId) {
    try {
      return await this.restUserUpdater_.update(this.getErisBot(), userId);
    } catch (err) {
      this.coreLogger.error({ event: 'ERROR UPDATING USER FROM REST', detail: userId, err });
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

    PaginatedMessageStaticEvents.on('error', err => {
      this.coreLogger.error({
        event: 'PAGINATED MESSAGE STATIC ERROR',
        err,
      });
    });

    this.bot_.on('ready', () => {
      try {
        this.coreLogger.info({ event: 'ALL SHARDS CONNECTED', detail: 'We have liftoff' });
        this.commandManager_.loadInteractions();
        this.rotateStatuses_();
        this.trackerStatsUpdater.startUpdateLoop();
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('messageCreate', msg => {
      try {
        this.onMessageCreate_(msg);
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('interactionCreate', interaction => {
      try {
        interaction.author = interaction.user ?? interaction.member?.user;

        if (this.blacklist_.isUserBlacklistedQuick(interaction.author.id)) {
          return;
        }

        if (interaction.type === 3) {
          return InteractiveMessage.handleInteraction(interaction)
            .catch((err) => {
              this.coreLogger.error({
                event: 'INTERACTION HANDLER ERROR',
                err,
                detail: `Server: ${interaction.guildID ?? 'DM'} - Interactive message ID: ${err.interactiveMessageId}`,
              });
            });
        } else {
          this.commandManager_.processInteraction(this.bot_, interaction);
        }
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('guildCreate', guild => {
      try {
        this.coreLogger.info({ event: 'JOINED GUILD', guild });
        this.blacklist_.leaveGuildIfBlacklisted(guild).then((left) => {
          if (left) {
            this.coreLogger.info({ event: 'LEAVING BLACKLISTED GUILD', guild });
          }
        }).catch(err => {
          this.coreLogger.error({ event: 'ERROR LEAVING BLACKLISTED GUILD', guild, err });
        });
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('error', (err, shardId) => {
      try {
        const detail = shardId === undefined
          ? undefined
          : `Shard ${shardId}`;

        if (err?.code === 1006 || err?.code === 1001) {
          this.coreLogger.warn({ event: 'CONNECTION WARNING', shardId, detail });
        } else if (err?.message?.includes(`(reading 'add')`)) {
          this.coreLogger.error({ event: 'ERROR', shardId, detail: 'Error reading add, Shard' + shardId });
        } else if (err?.message?.includes(`(reading 'remove')`)) {
          this.coreLogger.error({ event: 'ERROR', shardId, detail: 'Error reading remove, Shard' + shardId });
        } else if (err?.message?.includes(`(reading 'get')`)) {
          this.coreLogger.error({ event: 'ERROR', shardId, detail: 'Error reading get, Shard' + shardId });
        } else {
          this.coreLogger.error({ event: 'ERROR', shardId, detail, err: err?.error || err });
        }
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('disconnect', () => {
      try {
        this.coreLogger.info({ event: 'ALL SHARDS DISCONNECTED' });
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('shardDisconnect', (err, shardId) => {
      try {
        this.coreLogger.info({ event: 'SHARD DISCONNECTED', shardId, err, detail: `Shard ${shardId} disconnected` });
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('shardResume', (shardId) => {
      try {
        this.coreLogger.info({ event: 'SHARD RECONNECTED', shardId, detail: `Shard ${shardId} reconnected` });
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('warn', message => {
      try {
        if (message?.startsWith?.('Unhandled MESSAGE_CREATE type: {')) {
          const detail = `Unhandled MESSAGE_CREATE ` + message.slice(35, 45);
          this.coreLogger.warn({ event: 'ERIS WARNING', detail });
          return;
        }

        if (message?.message?.startsWith?.('Unknown guild text channel type: ')) {
          const detail = message.message.slice(0, 35);
          this.coreLogger.warn({ event: 'ERIS WARNING', detail });
          return;
        }

        this.coreLogger.warn({ event: 'ERIS WARNING', detail: message });
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('shardReady', (shardId) => {
      try {
        this.coreLogger.info({ event: 'SHARD READY', shardId, detail: `Shard ${shardId} connected` });
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('messageReactionAdd', (msg, emoji, member) => {
      try {
        replyDeleter.handleReaction(msg, member.id, emoji, this.logger);
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('messageDelete', msg => {
      try {
        replyDeleter.handleMessageDeleted(this.bot_, msg, this.logger);
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    this.bot_.on('guildDelete', (guild, unavailable) => {
      try {
        if (!unavailable) {
          this.coreLogger.info({ event: 'LEFT GUILD', guild });
        }
        this.persistence_.resetPrefixesForServerId(guild.id).catch(err => {
          this.coreLogger.error({
            event: 'ERROR RESETTING PREFIXES AFTER LEAVING GUILD',
            guild,
            err,
          });
        });
      } catch (err) {
        console.warn('Monochrome Unhandled', err);
      }
    });

    return this.bot_.connect();
  }

  tryGiveMessageToWaiter_(msg) {
    for (let i = 0; i < this.messageWaiters_.length; i += 1) {
      const waiter = this.messageWaiters_[i];
      try {
        if (waiter.checkMessage(msg)) {
          this.messageWaiters_.splice(i, 1);
          waiter.fulfill(msg);
          return true;
        }
      } catch (err) {
        this.coreLogger.error({ event: 'MESSAGE WAITER ERROR', err }, 'A message waiter\'s checkMessage function threw.');
      }
    }

    return false;
  }

  onMessageCreate_(msg) {
    try {
      if (msg.author.bot && this.options_.ignoreOtherBots) {
        return;
      }
      if (this.blacklist_.isUserBlacklistedQuick(msg.author.id)) {
        return;
      }

      if (msg.channel && !msg.channel.createMessage) {
        msg.channel.createMessage = (...args) => this.bot_.createMessage(msg.channel.id, ...args);
      }

      if (this.tryGiveMessageToWaiter_(msg)) {
        return;
      }
      if (this.commandManager_.processInput(this.bot_, msg)) {
        return;
      }
      if (this.messageProcessorManager_.processInput(this.bot_, msg)) {
        return;
      }
    } catch (err) {
      this.coreLogger.error({ event: 'TOP LEVEL ERROR', err }, 'Error caught at top level (probably a bug in monochrome)');
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
          this.coreLogger.error({ event: 'ERROR ROTATING STATUS', err });
        }
      }, intervalInMs);
    }
  }
}

module.exports = Monochrome;
