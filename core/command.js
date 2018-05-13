'use strict'
const reload = require('require-reload')(require);
const PublicError = reload('./public_error.js');
const strings = reload('./string_factory.js').command;
const SettingsConverters = reload('./settings_converters.js');
const SettingsValidators = reload('./settings_validators.js');
const Constants = reload('./constants.js');
const userIsServerAdmin = reload('./util/user_is_server_admin.js');

function sanitizeCommandData(commandData) {
  if (!commandData) {
    throw new Error(strings.validation.noData);
  } else if (!commandData.commandAliases || commandData.commandAliases.length === 0) {
    throw new Error(strings.validation.noAliases);
  } else if (typeof commandData.commandAliases === typeof '') {
    commandData.commandAliases = [commandData.commandAliases];
  }

  let aliases = [];
  for (let alias of commandData.commandAliases) {
    if (typeof alias !== typeof '' || alias === '') {
      throw new Error(strings.validation.invalidAlias);
    }

    aliases.push(alias.toLowerCase());
  }
  commandData.commandAliases = aliases;

  if (!commandData.action || typeof commandData.action !== 'function') {
    throw new Error(strings.validation.noAction);
  } else if (commandData.serverAdminOnly !== undefined && typeof commandData.serverAdminOnly !== typeof true) {
    throw new Error(strings.validation.invalidServerAdminOnly);
  } else if (commandData.botAdminOnly !== undefined && typeof commandData.botAdminOnly !== typeof true) {
    throw new Error(strings.validation.invalidBotAdminOnly);
  } else if (commandData.canBeChannelRestricted !== undefined && typeof commandData.canBeChannelRestricted !== typeof true) {
    throw new Error(strings.validation.invalidCanBeChannelRestricted);
  } else if (commandData.onlyInServer !== undefined && typeof commandData.onlyInServer !== typeof true) {
    throw new Error(strings.validation.invalidOnlyInServer);
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
    throw new Error(strings.validation.invalidCanHandleExtension);
  }

  if (commandData.cooldown === undefined) {
    commandData.cooldown = 0;
  } else if (typeof commandData.cooldown !== typeof 1.5) {
    throw new Error(strings.validation.invalidCooldown);
  } else if (commandData.cooldown < 0) {
    throw new Error(strings.validation.negativeCooldown);
  }
  if (commandData.canBeChannelRestricted && (!commandData.uniqueId || typeof commandData.uniqueId !== typeof '')) {
    throw new Error(strings.validation.needsUniqueId);
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
    throw new Error(strings.validation.invalidRequiredSettings);
  }
  if (commandData.requiredSettings.find(setting => typeof setting !== typeof '')) {
    throw new Error(strings.validation.nonStringSetting);
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
      description: strings.settings.createEnabledSettingDescription(this.getEnabledSettingUserFacingName_()),
      allowedValuesDescription: '**Enabled** or **Disabled**',
      defaultUserFacingValue: 'Enabled',
      uniqueId: this.getEnabledSettingUniqueId(),
      serverOnly: true,
      convertUserFacingValueToInternalValue: SettingsConverters.createStringToBooleanConverter('enabled', 'disabled'),
      convertInternalValueToUserFacingValue: SettingsConverters.createBooleanToStringConverter('Enabled', 'Disabled'),
      validateInternalValue: SettingsValidators.isBoolean,
    };
  }

  async handle(bot, msg, suffix, extension, config) {
    if (this.usersCoolingDown_.indexOf(msg.author.id) !== -1) {
      let publicErrorMessage = strings.invokeFailure.createNotCooledDownString(msg.author.username, this.cooldown_);
      throw PublicError.createWithCustomPublicMessage(publicErrorMessage, true, strings.invokeFailure.notCooledDownLogDescription);
    }
    let isBotAdmin = config.botAdminIds.indexOf(msg.author.id) !== -1;
    if (this.botAdminOnly_ && !isBotAdmin) {
      throw PublicError.createWithCustomPublicMessage(strings.invokeFailure.onlyBotAdmin, true, strings.invokeFailure.onlyBotAdminLog);
    }
    if (this.onlyInServer_ && !msg.channel.guild) {
      throw PublicError.createWithCustomPublicMessage(strings.invokeFailure.onlyInServer, true, strings.invokeFailure.onlyInServerLog);
    }
    if (this.serverAdminOnly_ && !isBotAdmin) {
      let isServerAdmin = userIsServerAdmin(msg, config);

      if (!isServerAdmin) {
        let publicMessage = strings.invokeFailure.createMustBeServerAdminString(config.serverAdminRoleName);
        throw PublicError.createWithCustomPublicMessage(publicMessage, true, strings.invokeFailure.mustBeServerAdminLog);
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
      return this.invokeAction_(bot, msg, suffix, settingsMap, extension, config);
    } else {
      let publicMessage = '';
      if (!settings[Constants.DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_ID]) {
        publicMessage = strings.invokeFailure.commandDisabled;
      }
      throw PublicError.createWithCustomPublicMessage(publicMessage, true, strings.invokeFailure.commandDisabledLog);
    }
  }

  invokeAction_(bot, msg, suffix, settings, extension, config) {
    if (this.cooldown_ !== 0) {
      this.usersCoolingDown_.push(msg.author.id);
    }
    setTimeout(() => {
      let index = this.usersCoolingDown_.indexOf(msg.author.id);
      this.usersCoolingDown_.splice(index, 1);
    },
    this.cooldown_ * 1000);

    if (this.attachIsServerAdmin_) {
      msg.authorIsServerAdmin = userIsServerAdmin(msg, config);
    }

    return this.action_(bot, this.monochrome_, msg, suffix, settings, extension);
  }

  getEnabledSettingUserFacingName_() {
    return this.aliases[0];
  }
}

module.exports = Command;
