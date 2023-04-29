const FulfillmentError = require('./fulfillment_error.js');
const SettingsConverters = require('./settings_converters.js');
const SettingsValidators = require('./settings_validators.js');
const Constants = require('./constants.js');
const { userStringForPermission } = require('./permissions.js');

function sanitizeCommandData(commandData) {
  if (!commandData) {
    throw new Error('No command data');
  } else if (!commandData.commandAliases || commandData.commandAliases.length === 0) {
    throw new Error('Command does not have command aliases.');
  } else if (typeof commandData.commandAliases === typeof '') {
    commandData.commandAliases = [commandData.commandAliases];
  }

  let aliases = [];
  for (let alias of commandData.commandAliases) {
    if (typeof alias !== typeof '' || alias === '') {
      throw new Error('Command alias is not a string, or is an empty string.');
    }

    aliases.push(alias.toLowerCase());
  }
  commandData.commandAliases = aliases;

  if (!commandData.action || typeof commandData.action !== 'function') {
    throw new Error('Command does not have an action, or it is not a function.');
  } else if (commandData.botAdminOnly !== undefined && typeof commandData.botAdminOnly !== typeof true) {
    throw new Error('Invalid botAdminOnly value');
  } else if (commandData.canBeChannelRestricted !== undefined && typeof commandData.canBeChannelRestricted !== typeof true) {
    throw new Error('Invalid canBeChannelRestricted value');
  } else if (commandData.canBeChannelRestricted === undefined) {
    if (commandData.botAdminOnly) {
      commandData.canBeChannelRestricted = false;
    } else {
      commandData.canBeChannelRestricted = true;
    }
  } else {
    commandData.canBeChannelRestricted = commandData.canBeChannelRestricted;
  }

  if (commandData.canHandleExtension && typeof commandData.canHandleExtension !== 'function') {
    throw new Error('Command has a canHandleExtension property, but it\'s not a function. It must be.');
  }

  if (commandData.cooldown === undefined) {
    commandData.cooldown = 0;
  } else if (typeof commandData.cooldown !== typeof 1.5) {
    throw new Error('Invalid cooldown, it\'s not a number');
  } else if (commandData.cooldown < 0) {
    throw new Error('Cooldown is less than 0. Cannot reverse time.');
  }
  if (!commandData.uniqueId || typeof commandData.uniqueId !== typeof '') {
    throw new Error('The command needs to have a uniqueId');
  }
  if (commandData.uniqueId && commandData.uniqueId.indexOf(' ') !== -1) {
    throw new Error('uniqueId must not contain a space.');
  }

  if (typeof commandData.requiredSettings === typeof '') {
    commandData.requiredSettings = [commandData.requiredSettings];
  } else if (commandData.requiredSettings === undefined) {
    commandData.requiredSettings = [];
  }
  if (!Array.isArray(commandData.requiredSettings)) {
    throw new Error('Invalid value for requiredSettings. It must be a string or an array of strings.');
  }
  if (commandData.requiredSettings.find(setting => typeof setting !== typeof '')) {
    throw new Error('A required setting is not a string.');
  }
  if (!commandData.requiredBotPermissions) {
    commandData.requiredBotPermissions = [];
  }
  const unknownPermission = commandData.requiredBotPermissions.find(perm => !userStringForPermission[perm]);
  if (unknownPermission) {
    throw new Error(`Unknown bot permission: ${unknownPermission}. See https://abal.moe/Eris/docs/reference for allowed permissions. Voice permissions are not valid here.`);
  }
  if (commandData.interaction && !commandData.shortDescription) {
    throw new Error(`Command has an interaction but no short description.`);
  }
  for (const option of commandData.interaction?.options ?? []) {
    if (option.autocomplete && !option.performAutoComplete) {
      throw new Error(`Command has an interaction option with autocomplete set to true but no performAutoComplete function.`);
    }
  }
  return commandData;
}

/**
 * A function to perform a command. This function is invoked when a user message
 * starts with the server's command prefix plus one of the command's aliases.
 * @callback Command~commandAction
 * @param {external:"Eris.Client"} bot
 * @param {external:"Eris.Message"} msg - The message that triggered the command
 * @param {string} suffix - The part of the message that follows the command invocation (i.e. for "prefix!command do the command", the prefix is "do the command")
 * @param {Monochrome} monochrome
 * @param {Object} settings - The requested setting values. The keys of this object are the setting unique IDs, and the values are the settings values.
 * @returns {Promise|undefined} If a promise is returned, it will be resolved, and if it rejects, that error will be logged and handled. In general, your
 *   commands should return promises.
 */

/**
 * A definition of one command. Each command definition should
 * be a module in your commands directory (specified as a constructor option to {@link Monochrome}).
 * Each command definition file should export one command definition.
 * @typedef {Object} Command~CommandDefinition
 * @property {string[]} commandAliases - The part of the command that follows the prefix. For example if
 *   your prefixes (specified as a constructor option to {@link Monochrome}) contain "command!"" and your command
 *   aliases contain "ping", then "command!ping" will trigger this command (if the prefix has not been customized in the server).
 * @property {string} uniqueId - A unique ID to identify the command. This can be anything, and won't be shown to users. You should
 *   never change it.
 * @property {Command~commandAction} action - A function to perform the command.
 * @property {number} [cooldown=0] - A period of time (in seconds) to prevent that user from using this command after they previously used it.
 * @property {string} [shortDescription] - A brief description of what the command does. This is intended to be displayed by the help command.
 *    If "&lt;prefix&gt;" is present in this string, it will be replaced with the primary command prefix in the server.
 * @property {string} [longDescription] - A longer description of what the command does. This is intended to be displayed by the help command when
 *   the user requests to see the advanced help for the command. If "&lt;prefix&gt;" is present in this string, it will be replaced with the primary
 *   command prefix in the server.
 * @property {string} [usageExample] - An example of how to use the command. If "&lt;prefix&gt;" is present in this string, it will be replaced with the primary
 *   command prefix in the server.
 * @property {boolean} [botAdminOnly=false] - If true, only a bot admin can use this command. Bot admins are specified as a constructor option to {@link Monochrome}.
 * @property {boolean} [canBeChannelRestricted=!botAdminOnly] - If true, server admins can disable this command in any channel in their server.
 * @property {string[]} [requiredSettings=[]] - An array of setting unique IDs that are required for this command. When this command is invoked, the values of
 *   those settings are looked up and passed into your [commandAction]{@link Command~commandAction} function.
 * @property {string[]} [aliasesForHelp] - If you don't want to show some of the command aliases in the help, you can specify which ones you do want to show here.
 *   By default, all aliases are shown in the help.
 * @property {string[]} [requiredBotPermissions] - The permissions that the bot must have in order to execute the command. See Eris.Constants.Permissions at {@link https://abal.moe/Eris/docs/reference}.
 * @example
 * module.exports = {
   commandAliases: ['ping', 'p'],
   uniqueId: 'ping',
   cooldown: 5,
   shortDescription: 'You say <prefix>ping, I say pong.',
   longDescription: 'This command is really useless and has no need for a long description but ¯\_(ツ)_/¯',
   usageExample: '<prefix>ping',
   botAdminOnly: false,
   canBeChannelRestricted: true,
   requiredSetting: ['unique_id_of_some_setting'],
   aliasesForHelp: ['ping'],
   requiredBotPermissions: ['readMessages', 'sendMessages'],
   action(bot, msg, suffix, monochrome, requestedSettings) {
     return msg.channel.createMessage('Pong!', null, msg);
   },
 };

 */

/**
 * Represents a command. Commands cannot be constructed directly. The constructor is shown here due to JSDoc limitations.
 * Commands are constructed by the {@link CommandManager} which reads the command
 * definition modules in your commands directory (specified as a constructor option to {@link Monochrome})
 * and constructs commands accordingly. For help writing a command definition, and an example, see {@link Command~CommandDefinition}.
 * For fully-functional example commands, see the [monochrome demo]{@link https://github.com/mistval/monochrome-demo/tree/master/commands}.
 * @property {string[]} aliases
 * @property {string} shortDescription
 * @property {string} longDescription
 * @property {string} usageExample
 * @property {string[]} aliasesForHelp - The aliases that should be displayed in the help command.
 * @property {boolean} hidden - True if information about this command should not be shown by the help command.
 */
class Command {
  constructor(commandData, monochrome) {
    commandData = sanitizeCommandData(commandData);
    this.aliases = commandData.commandAliases;
    this.uniqueId = commandData.uniqueId;
    this.requiredSettings_ = commandData.requiredSettings;
    this.action_ = commandData.action;
    this.botAdminOnly_ = !!commandData.botAdminOnly;
    this.cooldown_ = commandData.cooldown || 0;
    this.usersCoolingDown_ = [];
    this.shortDescription = commandData.shortDescription;
    this.longDescription = commandData.longDescription;
    this.usageExample = commandData.usageExample;
    this.canHandleExtension = commandData.canHandleExtension;
    this.aliasesForHelp = commandData.aliasesForHelp || this.aliases;
    this.attachIsServerAdmin_ = !!commandData.attachIsServerAdmin;
    this.canBeChannelRestricted_ = commandData.canBeChannelRestricted;
    this.monochrome_ = monochrome;
    this.requiredSettings_.push(this.getEnabledSettingUniqueId());
    this.requiredSettings_.push(Constants.DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_ID);
    this.hidden = !!commandData.hidden;
    this.requiredBotPermissions_ = commandData.requiredBotPermissions;
    this.interaction = commandData.interaction;
    if (commandData.initialize) {
      commandData.initialize(this.monochrome_);
    }
  }

  getCooldown() {
    return this.cooldown_;
  }

  getIsForBotAdminOnly() {
    return this.botAdminOnly_;
  }

  getEnabledSettingUniqueId() {
    return `enabled_commands/${this.uniqueId}_enabled`;
  }

  createEnabledSetting() {
    if (!this.canBeChannelRestricted_) {
      return undefined;
    }

    return {
      userFacingName: this.getEnabledSettingUserFacingName_(),
      description: `This setting controls whether the ${this.getEnabledSettingUserFacingName_()} command (and all of its aliases) is allowed to be used or not.`,
      allowedValuesDescription: '**Enabled** or **Disabled**',
      defaultUserFacingValue: 'Enabled',
      uniqueId: this.getEnabledSettingUniqueId(),
      userSetting: false,
      convertUserFacingValueToInternalValue: SettingsConverters.createStringToBooleanConverter('enabled', 'disabled'),
      convertInternalValueToUserFacingValue: SettingsConverters.createBooleanToStringConverter('Enabled', 'Disabled'),
      validateInternalValue: SettingsValidators.isBoolean,
    };
  }

  async handle(bot, msg, suffix) {
    if (this.usersCoolingDown_.indexOf(msg.author.id) !== -1) {
      const publicMessage = `${msg.author.username}, that command has a ${this.cooldown_} second cooldown.`;
      throw new FulfillmentError({
        publicMessage,
        autoDeletePublicMessage: true,
        logDescription: 'Not cooled down',
      });
    }

    let isBotAdmin = this.monochrome_.getBotAdminIds().indexOf(msg.author.id) !== -1;
    if (this.botAdminOnly_ && !isBotAdmin) {
      throw new FulfillmentError({ logDescription: 'User is not a bot admin' });
    }

    if (msg.channel.permissionsOf) {
      const botPermissions = msg.channel.permissionsOf(bot.user.id).json;
      const missingBotPermissions = this.requiredBotPermissions_.filter(perm => !botPermissions[perm]);
      if (missingBotPermissions.length > 0) {
        const requiredPermissionsString = missingBotPermissions.map(perm => userStringForPermission[perm]).join(', ');

        const publicMessage = missingBotPermissions.indexOf('sendMessages') === -1
          ? `I do not have the permissions I need to respond to that command. I need: **${requiredPermissionsString}**. A server admin can give me the permissions I need in the server settings.`
          : undefined;

        throw new FulfillmentError({
          publicMessage,
          autoDeletePublicMessage: false,
          logDescription: `Missing permissions (${requiredPermissionsString})`,
        });
      }
    }

    const settingsPromises = this.requiredSettings_.map(requiredSetting => {
      const serverId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
      return this.monochrome_.getSettings().getInternalSettingValue(
        requiredSetting,
        serverId,
        msg.channel,
        msg.author.id
      );
    });

    const settingsArray = await Promise.all(settingsPromises);
    const settingsMap = {};

    this.requiredSettings_.map((settingId, i) => {
      settingsMap[settingId] = settingsArray[i];
    });

    if (settingsMap[this.getEnabledSettingUniqueId()] === undefined || settingsMap[this.getEnabledSettingUniqueId()] === true) {
      return this.invokeAction_(bot, msg, suffix, settingsMap);
    } else {
      let publicMessage = '';
      if (!settingsMap[Constants.DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_ID]) {
        publicMessage = 'That command is disabled in this channel.';
      }
      throw new FulfillmentError({
        publicMessage,
        autoDeletePublicMessage: true,
        logDescription: 'Command disabled',
      });
    }
  }

  invokeAction_(bot, msg, suffix, settings) {
    if (this.cooldown_ !== 0) {
      this.usersCoolingDown_.push(msg.author.id);
    }
    setTimeout(() => {
      let index = this.usersCoolingDown_.indexOf(msg.author.id);
      this.usersCoolingDown_.splice(index, 1);
    },
    this.cooldown_ * 1000);

    if (this.attachIsServerAdmin_) {
      msg.authorIsServerAdmin = this.monochrome_.userIsServerAdmin(msg);
    }

    return this.action_(bot, msg, suffix, this.monochrome_, settings);
  }

  getEnabledSettingUserFacingName_() {
    return this.aliases[0];
  }

  interactionCompatibilityMode() {
    return this.interaction?.compatibilityMode ?? false;
  }

  autoCompleteInteraction(bot, interaction, option) {
    const autoCompleteOption = this.interaction.options.find(o => o.name === option.name);
    if (!autoCompleteOption) {
      throw new Error(`Option ${option.name} not found in command ${this.aliases[0]}`);
    }

    return autoCompleteOption.performAutoComplete(bot, interaction, option, this.monochrome_);
  }

  createInteraction() {
    if (!this.interaction) {
      return undefined;
    }

    return {
      name: this.aliases[0],
      type: 1,
      description: this.interaction.description ?? this.shortDescription,
      options: this.interaction.options ?? [],
    };
  }
}

module.exports = Command;
