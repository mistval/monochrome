'use strict'
const reload = require('require-reload')(require);
const Command = reload('./command.js');
const FileSystemUtils = reload('./util/file_system_utils.js');
const ReloadCommand = reload('./commands/reload.js');
const ShutdownCommand = reload('./commands/shutdown.js');
const SettingsCommand = reload('./commands/settings.js');
const PublicError = reload('./public_error.js');
const HelpCommand = reload('./commands/help.js');
const strings = reload('./string_factory.js').commandManager;
const Constants = reload('./constants.js');
const SettingsConverters = require('./settings_converters.js');
const SettingsValidators = require('./settings_validators.js');

const COMMAND_CATEGORY_NAME = 'Enabled commands';
const DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_NAME = 'Disabled commands fail silently';

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

function createDisabledCommandsFailSilentlySetting() {
  return {
    userFacingName: DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_NAME,
    description: 'If this setting is true, then I will do nothing when a user tries to use a disabled command. If this setting is false, then when a user tries to use a disabled command I will tell them that it\'s disabled.',
    defaultUserFacingValue: 'Disabled',
    allowedValuesDescription: '**Enabled** or **Disabled**',
    uniqueId: Constants.DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_ID,
    serverOnly: true,
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
  constructor(reloadAction, shutdownAction, logger, config, settings) {
    this.commands_ = [];
    this.settings_ = settings;
    this.reloadAction_ = reloadAction;
    this.shutdownAction_ = shutdownAction;
    this.logger_ = logger;
    this.config_ = config;
  }

  async load(directory, monochrome) {
    const loggerTitle = 'COMMAND MANAGER';
    let commandDatasToLoad = [];
    this.commands_ = [];
    try {
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

      for (let commandData of commandDatasToLoad) {
        let command;
        try {
          command = new Command(commandData, this.settings_, monochrome);
        } catch (err) {
          this.logger_.logFailure(loggerTitle, strings.validation.createFailedToLoadCommandWithUniqueIdMessage(commandData.uniqueId), err);
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

      if (this.config_.settingsCommandAliases && this.config_.settingsCommandAliases.length > 0) {
        let settingsCommandData = new SettingsCommand(this.config_);
        let settingsCommand = new Command(settingsCommandData, this.settings_, monochrome);
        this.commands_.push(settingsCommand);
      }
      if (this.reloadAction_) {
        let reloadCommandData = new ReloadCommand(this.reloadAction_);
        let reloadCommand = new Command(reloadCommandData, this.settings_, monochrome);
        this.commands_.push(reloadCommand);
      }
      if (this.shutdownAction_) {
        let shutdownCommandData = new ShutdownCommand(this.shutdownAction_);
        let shutdownCommand = new Command(shutdownCommandData, this.settings_, monochrome);
        this.commands_.push(shutdownCommand);
      }
      if (this.config_.commandsToGenerateHelpFor.length !== 0 && this.config_.autoGeneratedHelpCommandAliases.length !== 0) {
        let helpCommandData = new HelpCommand(this.commands_, this.config_);
        let helpCommand = new Command(helpCommandData, this.settings_, monochrome);
        this.commands_.push(helpCommand);
      }

      const settingsCategory = createSettingsCategoryForCommands(this.commands_);
      this.settings_.addNodeToRoot(settingsCategory);
    } catch (err) {
      this.logger_.logFailure(loggerTitle, strings.validation.genericError, err);
    }
  }

  /**
  * Tries to process user input as a command.
  * Note: this returning true does not mean that a command was necessarily successful. It only means that the input was handed to a command to process.
  */
  processInput(bot, msg) {
    let msgContent = msg.content.replace('\u3000', ' ');
    let spaceIndex = msgContent.indexOf(' ');
    let commandText = '';
    if (spaceIndex === -1) {
      commandText = msgContent;
    } else {
      commandText = msgContent.substring(0, spaceIndex);
    }
    commandText = commandText.toLowerCase();

    for (let command of this.commands_) {
      for (let alias of command.aliases) {
        if (commandText === alias) {
          return this.executeCommand_(bot, msg, command, alias, msgContent, spaceIndex);
        }
        if (command.canHandleExtension && commandText.startsWith(alias)) {
          let extension = commandText.replace(alias, '');
          if (command.canHandleExtension(extension)) {
            return this.executeCommand_(bot, msg, command, alias, msgContent, spaceIndex, extension);
          }
        }
      }
    }

    return false;
  }

  async executeCommand_(bot, msg, commandToExecute, alias, msgContent, spaceIndex, extension) {
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
