'use strict'
const reload = require('require-reload')(require);
const Command = reload('./command.js');
const FileSystemUtils = reload('./util/file_system_utils.js');
const PublicError = reload('./public_error.js');
const HelpCommandHelper = reload('./help_command_helper.js');
const strings = reload('./string_factory.js').commandManager;
const Constants = reload('./constants.js');
const SettingsConverters = require('./settings_converters.js');
const SettingsValidators = require('./settings_validators.js');

const COMMAND_CATEGORY_NAME = 'Enabled commands';
const DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_NAME = 'Disabled commands fail silently';
const PREFIXES_SETTING_NAME = 'Command prefixes';
const PREFIXES_SETTING_UNIQUE_ID = 'prefixes';

function handleCommandError(msg, err, config, logger) {
  const loggerTitle = 'COMMAND';
  let errorToOutput = err;
  if (!errorToOutput.output) {
    errorToOutput = PublicError.createInsufficientPrivilegeError(err);
    if (!errorToOutput) {
      errorToOutput = PublicError.createWithGenericPublicMessage(false, '', err);
    }
  }
  errorToOutput.output(logger, loggerTitle, config, msg);
}

function getDuplicateAlias(command, otherCommands) {
  for (let alias of command.aliases) {
    if (otherCommands.find(cmd => cmd.aliases.indexOf(alias) !== -1)) {
      return alias;
    }
  }
}

function createSettingsForCommands(userCommands) {
  return userCommands
    .map(command => command.createEnabledSetting())
    .filter(setting => !!setting);
}

function savePrefixes(persistence, settingUniqueId, serverId, channelId, userId, newInternalValue) {
  return persistence.editPrefixesForServerId(serverId, newInternalValue);
}

function getPrefixes(persistence, setting, serverId) {
  return persistence.getPrefixesForServerId(serverId);
}

function createPrefixesSetting(defaultPrefixes) {
  return {
    userFacingName: PREFIXES_SETTING_NAME,
    description: 'This setting controls what command prefix(es) I will respond to.',
    defaultUserFacingValue: defaultPrefixes.join(' '),
    allowedValuesDescription: 'A **space separated** list of prefixes',
    uniqueId: PREFIXES_SETTING_UNIQUE_ID,
    userSetting: false,
    channelSetting: false,
    requireConfirmation: true,
    convertUserFacingValueToInternalValue: SettingsConverters.createStringToStringArrayConverter(' '),
    convertInternalValueToUserFacingValue: SettingsConverters.createStringArrayToStringConverter(' '),
    validateInternalValue: SettingsValidators.isStringArray,
    updateSetting: savePrefixes,
    getInternalSettingValue: getPrefixes,
  };
}

function createDisabledCommandsFailSilentlySetting() {
  return {
    userFacingName: DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_NAME,
    description: 'If this setting is true, then I will do nothing when a user tries to use a disabled command. If this setting is false, then when a user tries to use a disabled command I will tell them that it\'s disabled.',
    defaultUserFacingValue: 'Disabled',
    allowedValuesDescription: '**Enabled** or **Disabled**',
    uniqueId: Constants.DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_ID,
    userSetting: false,
    convertUserFacingValueToInternalValue: SettingsConverters.createStringToBooleanConverter('enabled', 'disabled'),
    convertInternalValueToUserFacingValue: SettingsConverters.createBooleanToStringConverter('Enabled', 'Disabled'),
    validateInternalValue: SettingsValidators.isBoolean,
  };
}

function createSettingsCategoryForCommands(userCommands) {
  let children = createSettingsForCommands(userCommands);
  if (!children || children.length === 0) {
    return;
  }
  children.push(createDisabledCommandsFailSilentlySetting());
  return {
    userFacingName: COMMAND_CATEGORY_NAME,
    children: children,
  };
}

class CommandManager {
  constructor(logger, config, settings, persistence) {
    this.commands_ = [];
    this.settings_ = settings;
    this.logger_ = logger;
    this.config_ = config;
    this.persistence_ = persistence;
  }

  getHelpCommandHelper() {
    return this.helpCommandHelper_;
  }

  async load(directory, monochrome) {
    const loggerTitle = 'COMMAND MANAGER';
    let commandDatasToLoad = [];
    this.commands_ = [];

    try {
      if (directory) {
        const commandFiles = await FileSystemUtils.getFilesInDirectory(directory);
        for (let commandFile of commandFiles) {
          try {
            let commandData = reload(commandFile);
            commandDatasToLoad.push(commandData);
          } catch (e) {
            this.logger_.logFailure(loggerTitle, strings.validation.createFailedToLoadCommandFromFileMessage(commandFile), e);
            continue;
          }
        }
      }

      for (let commandData of commandDatasToLoad) {
        let command;
        try {
          command = new Command(commandData, this.settings_, monochrome);
        } catch (err) {
          this.logger_.logFailure(loggerTitle, strings.validation.createFailedToLoadCommandWithUniqueIdMessage(commandData.uniqueId || (commandData.commandAliases ? commandData.commandAliases[0] : undefined)), err);
          continue;
        }
        if (commandData.uniqueId && this.commands_.find(cmd => cmd.uniqueId === commandData.uniqueId)) {
          this.logger_.logFailure(loggerTitle, strings.validation.createNonUniqueUniqueIdMessage(commandData.uniqueId));
          continue;
        }

        let duplicateAlias = getDuplicateAlias(command, this.commands_);
        if (duplicateAlias) {
          this.logger_.logFailure(loggerTitle, strings.validation.createNonUniqueAliasMessage(commandData.uniqueId, duplicateAlias));
          continue;
        }

        this.commands_.push(command);
      }

      this.helpCommandHelper_ = new HelpCommandHelper(this.commands_, this.config_, this.settings_, this.persistence_);

      const settingsCategory = createSettingsCategoryForCommands(this.commands_);
      this.settings_.addNodeToRoot(settingsCategory);

      if (this.config_.prefixes && (this.config_.prefixes.length > 1 || !!this.config_.prefixes[0])) {
        const prefixesSetting = createPrefixesSetting(this.config_.prefixes);
        this.settings_.addNodeToRoot(prefixesSetting);
      }
    } catch (err) {
      this.logger_.logFailure(loggerTitle, strings.validation.genericError, err);
    }
  }

  /**
  * Tries to process user input as a command.
  * Note: this returning true does not mean that a command was necessarily successful. It only means that the input was handed to a command to process.
  */
  processInput(bot, msg) {
    const serverId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
    const prefixes = this.persistence_.getPrefixesForServerId(serverId);
    let msgContent = msg.content.replace('\u3000', ' ');
    let spaceIndex = msgContent.indexOf(' ');
    let commandText = '';
    if (spaceIndex === -1) {
      commandText = msgContent;
    } else {
      commandText = msgContent.substring(0, spaceIndex);
    }

    for (let prefix of prefixes) {
      for (let command of this.commands_) {
        for (let alias of command.aliases) {
          const prefixedAlias = prefix + alias;
          if (commandText === prefixedAlias) {
            return this.executeCommand_(bot, msg, command, msgContent, spaceIndex);
          }
          if (command.canHandleExtension && commandText.startsWith(prefixedAlias)) {
            let extension = commandText.replace(prefixedAlias, '');
            if (command.canHandleExtension(extension)) {
              return this.executeCommand_(bot, msg, command, msgContent, spaceIndex, extension);
            }
          }
        }
      }
    }

    return false;
  }

  async executeCommand_(bot, msg, commandToExecute, msgContent, spaceIndex, extension) {
    const loggerTitle = 'COMMAND';
    let suffix = '';
    if (spaceIndex !== -1) {
      suffix = msgContent.substring(spaceIndex + 1).trim();
    }
    try {
      const result = await commandToExecute.handle(bot, msg, suffix, extension, this.config_);
      if (typeof result === typeof '') {
        throw PublicError.createWithGenericPublicMessage(false, result);
      }
      this.logger_.logInputReaction(loggerTitle, msg, '', true);
    } catch (err) {
      handleCommandError(msg, err, this.config_, this.logger_);
    }

    return commandToExecute;
  }
}

module.exports = CommandManager;
