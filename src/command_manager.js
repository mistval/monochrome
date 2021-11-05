const Command = require('./command.js');
const FileSystemUtils = require('./util/file_system_utils.js');
const HelpCommandHelper = require('./help_command_helper.js');
const Constants = require('./constants.js');
const SettingsConverters = require('./settings_converters.js');
const SettingsValidators = require('./settings_validators.js');
const assert = require('assert');
const handleError = require('./handle_error.js');

const COMMAND_CATEGORY_NAME = 'Enabled commands';
const DISABLED_COMMANDS_FAIL_SILENTLY_SETTING_NAME = 'Disabled commands fail silently';
const PREFIXES_SETTING_NAME = 'Command prefixes';
const PREFIXES_SETTING_UNIQUE_ID = 'prefixes';

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
  return persistence.getPrefixesForServer(serverId);
}

function createPrefixesSetting(defaultPrefixes) {
  return {
    userFacingName: PREFIXES_SETTING_NAME,
    description: 'This setting controls what command prefix(es) I will respond to.',
    defaultUserFacingValue: defaultPrefixes.join(' '),
    allowedValuesDescription: 'A **space separated** list of prefixes',
    uniqueId: PREFIXES_SETTING_UNIQUE_ID,
    serverSetting: true,
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
    serverSetting: true,
    channelSetting: true,
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

/**
 * Responsible for delegating messages to command handlers.
 * The CommandManager can be accessed via {@link Monochrome#getCommandManager}.
 * @hideconstructor
 */
class CommandManager {
  constructor(directory, prefixes, monochrome) {
    this.monochrome_ = monochrome;
    this.commands_ = [];
    this.directory_ = directory;
    this.prefixes_ = prefixes;
    this.persistence_ = monochrome.getPersistence();
    this.logger = monochrome.getLogger().child({
      component: 'Monochrome::CommandManager',
    });
  }

  /**
   * Get the HelpCommandHelper which provides assistance for creating a help command.
   * @returns {HelpCommandHelper}
   */
  getHelpCommandHelper() {
    assert(this.helpCommandHelper_, 'Help command helper not available');
    return this.helpCommandHelper_;
  }

  load() {
    this.commands_ = [];

    if (this.directory_) {
      const commandFiles = FileSystemUtils.getFilesInDirectory(this.directory_);
      for (let commandFile of commandFiles) {
        try {
          let newCommandData = require(commandFile);
          let newCommand = new Command(newCommandData, this.monochrome_);

          if (this.commands_.find(existingCommand => existingCommand.uniqueId === newCommand.uniqueId)) {
            throw new Error(`There is another command with the same uniqueId`);
          }

          let duplicateAlias = getDuplicateAlias(newCommand, this.commands_);
          if (duplicateAlias) {
            throw new Error(`There is another command that also has the alias: ${duplicateAlias}`);
          }

          this.commands_.push(newCommand);
        } catch (err) {
          this.logger.error({
            event: 'FAILED TO LOAD COMMAND',
            detail: commandFile,
            err,
          });
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
    let prefixes = this.persistence_.getPrefixesForServer(serverId);
    let msgContent = msg.content;

    msgContent = msgContent.replace('\u3000', ' ');
    let spaceIndex = msgContent.indexOf(' ');
    let commandText = '';
    if (spaceIndex === -1) {
      commandText = msgContent;
    } else {
      commandText = msgContent.substring(0, spaceIndex);
    }

    commandText = commandText.toLowerCase();

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
    let suffix = '';
    if (spaceIndex !== -1) {
      suffix = msgContent.substring(spaceIndex + 1).trim();
    }
    try {
      await commandToExecute.handle(bot, msg, suffix);
      this.logger.info({
        event: 'COMMAND EXECUTED',
        commandId: commandToExecute.uniqueId,
        message: msg,
        detail: commandToExecute.uniqueId,
      });
    } catch (err) {
      handleError(this.logger, 'COMMAND ERROR', this.monochrome_, msg, err, false);
    }

    return commandToExecute;
  }
}

module.exports = CommandManager;
