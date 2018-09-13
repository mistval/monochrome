'use strict'
const PublicError = require('./public_error.js');
const SettingsConverters = require('./settings_converters.js');
const SettingsValidators = require('./settings_validators.js');
const Constants = require('./constants.js');

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
  } else if (commandData.serverAdminOnly !== undefined && typeof commandData.serverAdminOnly !== typeof true) {
    throw new Error('Invalid serverAdminOnly value');
  } else if (commandData.botAdminOnly !== undefined && typeof commandData.botAdminOnly !== typeof true) {
    throw new Error('Invalid botAdminOnly value');
  } else if (commandData.canBeChannelRestricted !== undefined && typeof commandData.canBeChannelRestricted !== typeof true) {
    throw new Error('Invalid canBeChannelRestricted value');
  } else if (commandData.onlyInServer !== undefined && typeof commandData.onlyInServer !== typeof true) {
    throw new Error('Invalid onlyInServer value');
  } else if (commandData.canBeChannelRestricted === undefined) {
    if (commandData.serverAdminOnly || commandData.botAdminOnly) {
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
  return commandData;
}

class Command {
  constructor(commandData, settings, monochrome) {
    commandData = sanitizeCommandData(commandData);
    this.aliases = commandData.commandAliases;
    this.uniqueId = commandData.uniqueId;
    this.requiredSettings_ = commandData.requiredSettings;
    this.action_ = commandData.action;
    this.serverAdminOnly_ = !!commandData.serverAdminOnly;
    this.botAdminOnly_ = !!commandData.botAdminOnly;
    this.onlyInServer_ = !!commandData.onlyInServer;
    this.cooldown_ = commandData.cooldown || 0;
    this.usersCoolingDown_ = [];
    this.shortDescription = commandData.shortDescription;
    this.longDescription = commandData.longDescription;
    this.usageExample = commandData.usageExample;
    this.canHandleExtension = commandData.canHandleExtension;
    this.aliasesForHelp = commandData.aliasesForHelp;
    this.attachIsServerAdmin_ = !!commandData.attachIsServerAdmin;
    this.canBeChannelRestricted_ = commandData.canBeChannelRestricted;
    this.monochrome_ = monochrome;
    this.settings_ = settings;
    this.requiredSettings_.push(this.getEnabledSettingUniqueId());
    this.requiredSettings_.push(Constants.DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_ID);
    this.hidden = !!commandData.hidden;
    if (commandData.initialize) {
      commandData.initialize(this.monochrome_);
    }
  }

  getCooldown() {
    return this.cooldown_;
  }

  getIsForServerAdminOnly() {
    return this.serverAdminOnly_;
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

  async handle(bot, msg, suffix, config) {
    if (this.usersCoolingDown_.indexOf(msg.author.id) !== -1) {
      let publicErrorMessage = `${msg.author.username}, that command has a ${this.cooldown_} second cooldown.`;
      throw PublicError.createWithCustomPublicMessage(publicErrorMessage, true, 'Not cooled down');
    }
    let isBotAdmin = config.botAdminIds.indexOf(msg.author.id) !== -1;
    if (this.botAdminOnly_ && !isBotAdmin) {
      throw PublicError.createWithCustomPublicMessage('Only a bot admin can use that command.', true, 'User is not a bot admin');
    }
    if (this.onlyInServer_ && !msg.channel.guild) {
      throw PublicError.createWithCustomPublicMessage('That command can only be used in a server.', true, 'Not in a server');
    }
    if (this.serverAdminOnly_ && !isBotAdmin) {
      let isServerAdmin = this.monochrome_.userIsServerAdmin(msg);

      if (!isServerAdmin) {
        throw PublicError.createWithCustomPublicMessage('You must be a server admin in order to use that command.', true, 'User is not a server admin');
      }
    }

    const settingsPromises = this.requiredSettings_.map(requiredSetting => {
      const serverId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
      return this.settings_.getInternalSettingValue(requiredSetting, serverId, msg.channel.id, msg.author.id);
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
      throw PublicError.createWithCustomPublicMessage(publicMessage, true, 'Command disabled');
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
}

module.exports = Command;
