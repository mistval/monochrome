'use strict'
const reload = require('require-reload')(require);
const persistence = require('./persistence.js');
const PublicError = reload('./public_error.js');
const strings = reload('./string_factory.js').command;

function sanitizeCommandData(commandData, settingsCategorySeparator) {
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
    } else if (settingsCategorySeparator && alias.indexOf(settingsCategorySeparator) !== -1) {
      throw new Error(strings.validation.createCannotContainCategorySeparatorString(settingsCategorySeparator));
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

/**
* Represents a command that users can invoke.
* @property {Array<String>} aliases - A list of aliases that should trigger this command.
* @property {Boolean} canBeChannelRestricted - True if the command is allowed to be restricted to individual server channels.
* @property {String} uniqueId - A uniqueId for the command (for purposes of persisting information about it).
*/
class Command {
  /**
  * @param {Object} commandData - The raw command loaded from a command file.
  */
  constructor(commandData, settingsCategorySeparator, enabledCommandsSettingsCategoryFullyQualifiedUserFacingName) {
    if (!settingsCategorySeparator) {
      throw new Error(strings.validation.noSettingsCategorySeparator);
    }
    if (!enabledCommandsSettingsCategoryFullyQualifiedUserFacingName) {
      throw new Error(strings.validation.noEnabledCommandsCategoryName);
    }
    commandData = sanitizeCommandData(commandData, settingsCategorySeparator);
    this.enabledCommandsFailSilentlyKey_ = 'enabled_commands' + settingsCategorySeparator + 'disabled_commands_fail_silently';
    this.aliases = commandData.commandAliases;
    this.uniqueId = commandData.uniqueId;
    this.requiredSettings_ = commandData.requiredSettings;
    this.action_ = commandData.action;
    this.serverAdminOnly_ = !!commandData.serverAdminOnly;
    this.botAdminOnly_ = !!commandData.botAdminOnly;
    this.onlyInServer_ = !!commandData.onlyInServer;
    this.cooldown_ = commandData.cooldown || 0;
    this.usersCoolingDown_ = [];
    this.settingsCategorySeparator_ = settingsCategorySeparator;
    this.shortDescription = commandData.shortDescription;
    this.longDescription = commandData.longDescription;
    this.usageExample = commandData.usageExample;
    this.canHandleExtension = commandData.canHandleExtension;
    this.aliasesForHelp = commandData.aliasesForHelp;
    if (commandData.canBeChannelRestricted) {
      this.enabledSettingFullyQualifiedUserFacingName_ = enabledCommandsSettingsCategoryFullyQualifiedUserFacingName +
        settingsCategorySeparator +
        this.getEnabledSettingUserFacingName_();
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

  createEnabledSetting() {
    if (this.enabledSettingFullyQualifiedUserFacingName_) {
      return {
        userFacingName: this.getEnabledSettingUserFacingName_(),
        databaseFacingName: strings.settings.createDatabaseFacingEnabledSettingName(this.uniqueId),
        type: 'SETTING',
        description: strings.settings.createEnabledSettingDescription(this.aliases[0]),
        valueType: 'BOOLEAN',
        defaultDatabaseFacingValue: true,
      };
    }
  }

  /**
  * Handle a command.
  * @param {Eris.Client} bot - The Eris bot.
  * @param {Eris.Message} msg - The Eris message to handle.
  * @param {String} suffix - The command suffix.
  * @param {String} extension - The command extension, if there is one.
  * @param {Object} config - The monochrome config.
  * @param {Object} settingsGetter - An object with a getSettings() function.
  * @returns {(String|undefined|Promise)} An error string if there is a benign, expected error (invalid command syntax, etc).
  *    undefined if there is no error.
  *    A promise can also be returned. It should resolve with either a benign error string, or undefined.
  *    If it rejects, the error will be logged, and the generic error message will be sent to the channel.
  *    (Or if the error is a PublicError, or if it has a publicMessage property, the value of that property
  *    will be sent to the channel instead of the generic error message)
  */
  handle(bot, msg, suffix, extension, config, settingsGetter) {
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

    let requiredSettings = this.requiredSettings_;
    if (this.enabledSettingFullyQualifiedUserFacingName_) {
      requiredSettings.push(this.enabledSettingFullyQualifiedUserFacingName_);
      requiredSettings.push(this.enabledCommandsFailSilentlyKey_);
    }
    return settingsGetter.getSettings(bot, msg, requiredSettings).then(settings => {
      if (!this.enabledSettingFullyQualifiedUserFacingName_ ||
        settings[this.enabledSettingFullyQualifiedUserFacingName_] === true ||
        settings[this.enabledSettingFullyQualifiedUserFacingName_] === undefined) {
        return this.invokeAction_(bot, msg, suffix, settings, extension);
      }

      let publicMessage = '';
      if (!settings[this.enabledCommandsFailSilentlyKey_]) {
        publicMessage = strings.invokeFailure.commandDisabled;
      }
      throw PublicError.createWithCustomPublicMessage(publicMessage, true, strings.invokeFailure.commandDisabledLog);
    });
  }

  getEnabledSettingFullyQualifiedUserFacingName() {
    return this.enabledSettingFullyQualifiedUserFacingName_;
  }

  invokeAction_(bot, msg, suffix, settings, extension) {
    if (this.cooldown_ !== 0) {
      this.usersCoolingDown_.push(msg.author.id);
    }
    setTimeout(() => {
      let index = this.usersCoolingDown_.indexOf(msg.author.id);
      this.usersCoolingDown_.splice(index, 1);
    },
    this.cooldown_ * 1000);
    return this.action_(bot, msg, suffix, settings, extension);
  }

  getEnabledSettingUserFacingName_() {
    return this.aliases[0];
  }
}

function userIsServerAdmin(msg, config) {
  if (!msg.channel.guild) {
    return true;
  }

  let permission = msg.member.permission.json;
  if (permission.manageGuild || permission.administrator || permission.manageChannels) {
    return true;
  }

  let serverAdminRole = msg.channel.guild.roles.find((role) => {
    return role.name.toLowerCase() === config.serverAdminRoleName.toLowerCase();
  });

  if (serverAdminRole && msg.member.roles.indexOf(serverAdminRole.id) !== -1) {
    return true;
  }

  return false;
}

module.exports = Command;
