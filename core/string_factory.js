module.exports.command = {
  validation: {
    noData: 'No command data',
    noAction: 'Command does not have an action, or it is not a function.',
    noAliases: 'Command does not have command aliases.',
    invalidAlias: 'Command alias is not a string, or is an empty string.',
    invalidServerAdminOnly: 'Invalid serverAdminOnly value',
    invalidBotAdminOnly: 'Invalid botAdminOnly value',
    invalidCanBeChannelRestricted: 'Invalid canBeChannelRestricted value',
    invalidOnlyInServer: 'Invalid onlyInServer value',
    invalidCanHandleExtension: 'Command has a canHandleExtension property, but it\'s not a function. It must be.',
    invalidCooldown: 'Invalid cooldown, it\'s not a number',
    negativeCooldown: 'Cooldown is less than 0. Cannot reverse time.',
    needsUniqueId: 'Command has canBeChannelRestricted true (or undefined, defaulting to true), but does not have a uniqueId, or its uniqueId is not a string. Commands that can be channel restricted must have a uniqueId.',
    nonStringSetting: 'A required setting is not a string.',
    invalidRequiredSettings: 'Invalid value for requiredSettings. It must be a string or an array of strings.',
    noSettingsCategorySeparator: 'No settings category separator was passed into the command constructor. Unless you\'re monkeying around constructing Commands by hand, this is an internal error. Please report it.',
    noEnabledCommandsCategoryName: 'No enabled commands settings category name was passed into the command constructor. Unless you\'re monkeying around constructing Commands by hand, this is an internal error. Please report it.',
    createCannotContainCategorySeparatorString(separator) {
      return `An alias contains the settings category separator (${separator}). It must not.`;
    },
  },
  invokeFailure: {
    notCooledDownLogDescription: 'Not cooled down',
    onlyBotAdmin: 'Only a bot admin can use that command.',
    onlyBotAdminLog: 'User is not a bot admin',
    onlyInServer: 'That command can only be used in a server.',
    onlyInServerLog: 'Not in a server',
    mustBeServerAdminLog: 'User is not a server admin',
    commandDisabled: 'That command is disabled in this channel.',
    commandDisabledLog: 'Command disabled',
    createMustBeServerAdminString(serverAdminRoleName) {
      let errorMessage = 'You must be a server admin ';
      if (serverAdminRoleName) {
        errorMessage += 'or have a role called \'' + serverAdminRoleName + '\' ';
      }
      errorMessage += 'in order to do that.';
      return errorMessage;
    },
    createNotCooledDownString(username, cooldown) {
      return username + ', that command has a ' + cooldown.toString() + ' second cooldown.';
    },
  },
  settings: {
    createDatabaseFacingEnabledSettingName(uniqueId) {
      return uniqueId + '_enabled';
    },
    createEnabledSettingDescription(alias) {
      return `This setting controls whether the ${alias} command (and all of its aliases) is allowed to be used or not.`;
    },
  },
};

function createFailedToLoadCommandWithUniqueIdMessage(uniqueId) {
  if (uniqueId) {
    return 'Failed to load command with uniqueId: ' + uniqueId + '.';
  }
  return 'Failed to load command';
};

module.exports.commandManager = {
  validation: {
    genericError: 'Error loading commands.',
    createFailedToLoadCommandFromFileMessage(file) {
      return 'Failed to load command from file: ' + file;
    },
    createFailedToLoadCommandWithUniqueIdMessage(uniqueId) {
      return createFailedToLoadCommandWithUniqueIdMessage(uniqueId);
    },
    createNonUniqueUniqueIdMessage(uniqueId) {
      return createFailedToLoadCommandWithUniqueIdMessage(uniqueId) +
        ' Error: uniqueId: ' + uniqueId + ' not unique.';
    },
    createNonUniqueAliasMessage(uniqueId, duplicateAlias) {
      return createFailedToLoadCommandWithUniqueIdMessage(uniqueId) +
        ' Error: alias: ' + duplicateAlias + ' is not unique.';
    },
  },
  commandExecutionFailure: {
    missingPermissionsDiscordError: 'Missing Permissions',
    genericErrorDescriptionLog: 'Exception or promise rejection',
    createErrorDescription(commandText) {
      return 'Command \'' + commandText + '\' threw an exception or returned a promise that rejected.'
    },
  }
};

module.exports.help = {
  noCommandsForHelpLog: 'No commands for help',
};