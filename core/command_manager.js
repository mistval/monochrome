'use strict'
const reload = require('require-reload')(require);
const Command = reload('./command.js');
const FileSystemUtils = reload('./util/file_system_utils.js');
const ReloadCommand = reload('./commands/reload.js');
const ShutdownCommand = reload('./commands/shutdown.js');
const PublicError = reload('./public_error.js');
const HelpCommand = reload('./commands/help.js');
const strings = reload('./string_factory.js').commandManager;
const statistics = require('./statistics.js');

const COMMAND_CATEGORY_NAME = 'enabled_commands';
const DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_NAME = 'disabled_commands_fail_silently';

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
    type: 'SETTING',
    description: 'If this setting is true, then I will do nothing when a user tries to use a disabled command. If this setting is false, then when a user tries to use a disabled command I will tell them that it\'s disabled.',
    valueType: 'BOOLEAN',
    defaultDatabaseFacingValue: false,
  };

}

function createSettingsCategoryForCommands(userCommands) {
  let children = createSettingsForCommands(userCommands);
  if (!children || children.length === 0) {
    return;
  }
  children.push(createDisabledCommandsFailSilentlySetting());
  return {
    type: 'CATEGORY',
    userFacingName: COMMAND_CATEGORY_NAME,
    children: children,
  };
}

/**
* Loads and executes commands in response to user input.
* @param {function} [reloadAction] - A lambda for the reload command to call to execute a reload.
*/
class CommandManager {
  /**
  * @param {Function} reloadAction - The function that the reload command should invoke to initiate a reload.
  * @param {Logger} logger - The logger to log to.
  * @param {Object} config - The monochrome config data.
  * @param {Object} settingsGetter - An object with a getSettings() function.
  */
  constructor(reloadAction, shutdownAction, logger, config, settingsGetter) {
    this.commands_ = [];
    this.reloadAction_ = reloadAction;
    this.shutdownAction_ = shutdownAction;
    this.logger_ = logger;
    this.config_ = config;
    this.settingsGetter_ = settingsGetter;
    this.disabledCommandsFailSilentySettingFullyQualifiedName_ =
      COMMAND_CATEGORY_NAME + this.config_.settingsCategorySeparator + DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_NAME;
  }

  /**
  * Loads commands. Can be called to reload commands.
  * @param {String} directory - A file path to the command data directory.
  * @param {Array<Object>} extraCommandDatas - Any other command data that should be loaded.
  */
  load(directory, extraCommandDatas) {
    const loggerTitle = 'COMMAND MANAGER';
    let commandDatasToLoad = extraCommandDatas || [];
    this.commands_ = [];
    return FileSystemUtils.getFilesInDirectory(directory).then(commandFiles => {
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
          command = new Command(commandData, this.config_.settingsCategorySeparator, COMMAND_CATEGORY_NAME);
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

      if (this.config_.commandsToGenerateHelpFor.length !== 0 && this.config_.autoGeneratedHelpCommandAliases.length !== 0) {
        let helpCommandData = new HelpCommand(this.commands_, this.config_);
        let helpCommand = new Command(helpCommandData, this.config_.settingsCategorySeparator, COMMAND_CATEGORY_NAME);
        this.commands_.push(helpCommand);
      }

      if (this.reloadAction_) {
        let reloadCommandData = new ReloadCommand(this.reloadAction_);
        let reloadCommand = new Command(reloadCommandData, this.config_.settingsCategorySeparator, COMMAND_CATEGORY_NAME);
        this.commands_.push(reloadCommand);
      }
      if (this.shutdownAction_) {
        let shutdownCommandData = new ShutdownCommand(this.shutdownAction_);
        let shutdownCommand = new Command(shutdownCommandData, this.config_.settingsCategorySeparator, COMMAND_CATEGORY_NAME);
        this.commands_.push(shutdownCommand);
      }
    }).catch(err => {
      this.logger_.logFailure(loggerTitle, strings.validation.genericError, err);
    });
  }

  /**
  * Collects any settings categories that the command subsystem wants to register with the settings subsystem.
  * @returns {Array<SettingsCategory>} The settings categories this subsystem wants to register.
  */
  collectSettingsCategories() {
    let category = createSettingsCategoryForCommands(this.commands_);
    return category ? [category] : [];
  }

  /**
  * Tries to process user input as a command.
  * @param {Eris.Client} bot - The Eris bot.
  * @param {Eris.Message} msg - The msg to process.
  * @returns {Boolean} True if the input is processed as a command, false otherwise.
  *   Note: this returning true does not mean that a command was necessarily successful. It only means that the input was handed to a command to process.
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

  executeCommand_(bot, msg, commandToExecute, alias, msgContent, spaceIndex, extension) {
    const loggerTitle = 'COMMAND';
    let suffix = '';
    if (spaceIndex !== -1) {
      suffix = msgContent.substring(spaceIndex + 1).trim();
    }
    try {
      statistics.incrementCommandsExecutedForCommandName(commandToExecute.aliases[0], msg.author.id);
      commandToExecute.handle(bot, msg, suffix, extension, this.config_, this.settingsGetter_, this.disabledCommandsFailSilentySettingFullyQualifiedName_).then(result => {
        if (typeof result === typeof '') {
          throw PublicError.createWithGenericPublicMessage(false, result);
        }
        this.logger_.logInputReaction(loggerTitle, msg, '', true);
      }).catch(err => handleCommandError(msg, err, this.config_, this.logger_));
    } catch (err) {
      handleCommandError(msg, err, this.config_, this.logger_);
    }

    return commandToExecute;
  }
}

module.exports = CommandManager;
