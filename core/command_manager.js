'use strict'
const reload = require('require-reload')(require);
const Command = require('./command.js');
const FileSystemUtils = require('./util/file_system_utils.js');
const PublicError = require('./public_error.js');
const HelpCommandHelper = require('./help_command_helper.js');
const Constants = require('./constants.js');
const SettingsConverters = require('./settings_converters.js');
const SettingsValidators = require('./settings_validators.js');

const COMMAND_CATEGORY_NAME = 'Enabled commands';
const DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_NAME = 'Disabled commands fail silently';
const PREFIXES_SETTING_NAME = 'Command prefixes';
const PREFIXES_SETTING_UNIQUE_ID = 'prefixes';

function handleCommandError(msg, err, monochrome) {
  const loggerTitle = 'COMMAND';
  let errorToOutput = err;
  if (!errorToOutput.output) {
    errorToOutput = PublicError.createInsufficientPrivilegeError(err);
    if (!errorToOutput) {
      errorToOutput = PublicError.createWithGenericPublicMessage(false, '', err);
    }
  }

  errorToOutput.output(loggerTitle, msg, false, monochrome);
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
  constructor(directory, prefixes, monochrome) {
    this.monochrome_ = monochrome;
    this.commands_ = [];
    this.directory_ = directory;
    this.prefixes_ = prefixes;
    this.persistence_ = monochrome.getPersistence();
  }

  getHelpCommandHelper() {
    return this.helpCommandHelper_;
  }

  async load() {
    const loggerTitle = 'COMMAND MANAGER';
    this.commands_ = [];

    if (this.directory_) {
      const commandFiles = await FileSystemUtils.getFilesInDirectory(this.directory_);
      for (let commandFile of commandFiles) {
        try {
          let newCommandData = reload(commandFile);
          let newCommand = new Command(newCommandData, this.monochrome_);

          if (this.commands_.find(existingCommand => existingCommand.uniqueId === newCommand.uniqueId)) {
            throw new Error(`There is another command with the same uniqueId`);
          }

          let duplicateAlias = getDuplicateAlias(newCommand, this.commands_);
          if (duplicateAlias) {
            throw new Error(`There is another command that also has the alias: ${duplicateAlias}`);
          }

          this.commands_.push(newCommand);
        } catch (e) {
          this.monochrome_.getLogger().logFailure(loggerTitle, `Failed to load command in file: ${commandFile}`, e);
        }
      }
    }

    this.helpCommandHelper_ = new HelpCommandHelper(this.commands_, this.monochrome_.getSettings(), this.monochrome_.getPersistence());

    const settingsCategory = createSettingsCategoryForCommands(this.commands_);
    this.monochrome_.getSettings().addNodeToRoot(settingsCategory);

    if (this.prefixes_ && (this.prefixes_.length > 1 || !!this.prefixes_[0])) {
      const prefixesSetting = createPrefixesSetting(this.prefixes_);
      this.monochrome_.getSettings().addNodeToRoot(prefixesSetting);
    }
  }

  processInput(bot, msg) {
    let serverId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
    let prefixes = this.persistence_.getPrefixesForServerId(serverId);
    let msgContent = msg.content;

    // Break out early if no matching prefixes
    const numPrefixes = prefixes.length;
    const lastIndex = numPrefixes - 1;
    for (let i = 0; i < numPrefixes; ++i) {
      if (msgContent.startsWith(prefixes[i])) {
        break
      }
      if (i === lastIndex) {
        return false;
      }
    }

    msgContent = msgContent.replace('\u3000', ' ');
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
            return this.executeCommand_(bot, msg, command, msgContent, spaceIndex, prefix);
          }
          if (command.canHandleExtension && commandText.startsWith(prefixedAlias)) {
            let extension = commandText.replace(prefixedAlias, '');
            if (command.canHandleExtension(extension)) {
              return this.executeCommand_(bot, msg, command, msgContent, spaceIndex, prefix, extension);
            }
          }
        }
      }
    }

    return false;
  }

  async executeCommand_(bot, msg, commandToExecute, msgContent, spaceIndex, prefix, extension) {
    msg.prefix = prefix;
    msg.extension = extension;
    const loggerTitle = 'COMMAND';
    let suffix = '';
    if (spaceIndex !== -1) {
      suffix = msgContent.substring(spaceIndex + 1).trim();
    }
    try {
      const result = await commandToExecute.handle(bot, msg, suffix);
      if (typeof result === typeof '') {
        throw PublicError.createWithGenericPublicMessage(false, result);
      }
      this.monochrome_.getLogger().logInputReaction(loggerTitle, msg, '', true);
    } catch (err) {
      handleCommandError(msg, err, this.monochrome_);
    }

    return commandToExecute;
  }
}

module.exports = CommandManager;
