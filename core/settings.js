const reload = require('require-reload')(require);
const assert = require('assert');

const UpdateRejectionReason = {
  NOT_ADMIN: 'not admin',
  INVALID_VALUE: 'invalid value',
  SETTING_DOES_NOT_EXIST: 'that setting doesn\'t exist',
  NOT_ALLOWED_IN_SERVER: 'that setting cannot be set per-server',
  NOT_ALLOWED_IN_CHANNEL: 'that setting cannot be set per-channel',
  NOT_ALLOWED_FOR_USER: 'that setting cannot be set per-user',
};

const SettingScope = {
  SERVER: 'server',
  CHANNEL: 'channel',
  USER: 'user',
};

function createUpdateRejectionResultUserNotAdmin(treeNode) {
  return {
    accepted: false,
    reason: UpdateRejectionReason.NOT_ADMIN,
    setting: treeNode,
  };
}

function createUpdateRejectionResultValueInvalid(rejectedUserFacingValue, treeNode) {
  return {
    accepted: false,
    reason: UpdateRejectionReason.INVALID_VALUE,
    rejectedUserFacingValue: rejectedUserFacingValue,
    setting: treeNode,
  };
}

function createUpdateRejectionResultNoSuchSetting(settingUniqueId) {
  return {
    accepted: false,
    reason: UpdateRejectionReason.SETTING_DOES_NOT_EXIST,
    nonExistentUniqueId: settingUniqueId,
  };
}

function createUpdateRejectionResultNotInServer(treeNode) {
  return {
    accepted: false,
    reason: UpdateRejectionReason.NOT_ALLOWED_IN_SERVER,
    setting: treeNode,
  };
}

function createUpdateRejectionResultNotInChannel(treeNode) {
  return {
    accepted: false,
    reason: UpdateRejectionReason.NOT_ALLOWED_IN_CHANNEL,
    setting: treeNode,
  };
}

function createUpdateRejectionResultNotForUser(treeNode) {
  return {
    accepted: false,
    reason: UpdateRejectionReason.NOT_ALLOWED_FOR_USER,
    setting: treeNode,
  };
}

function createUpdateAcceptedResult(newUserFacingValue, newInternalValue, treeNode) {
  return {
    accepted: true,
    newUserFacingValue: newUserFacingValue,
    newInternalValue: newInternalValue,
    setting: treeNode,
  };
}

function getUserSetting(userData, settingUniqueId) {
  if (userData.settings && userData.settings.global) {
    return userData.settings.global[settingUniqueId];
  }

  return undefined;
}

function getServerSetting(serverData, settingUniqueId) {
  if (serverData.settings && serverData.settings.serverSettings) {
    return serverData.settings.serverSettings[settingUniqueId];
  }

  return undefined;
}

function getChannelSetting(serverData, channelId, settingUniqueId) {
  if (
    serverData.settings
    && serverData.settings.channelSettings
    && serverData.settings.channelSettings[channelId]
  ) {
    return serverData.settings.channelSettings[channelId][settingUniqueId];
  }

  return undefined;
}

function getTreeNodeForUniqueId(settingsTree, settingUniqueId) {
  for (const element of settingsTree) {
    if (element.uniqueId === settingUniqueId) {
      return element;
    }
    if (element.children) {
      const childTreeResult = getTreeNodeForUniqueId(element.children, settingUniqueId);
      if (childTreeResult) {
        return childTreeResult;
      }
    }
  }

  return undefined;
}

function defaultUpdateUserSettingValue(persistence, settingUniqueId, userId, newInternalValue) {
  assert(userId);
  return persistence.editDataForUser(userId, userData => {
    userData.settings = userData.settings || {};
    userData.settings.global = userData.settings.global || {};
    userData.settings.global[settingUniqueId] = newInternalValue;
    return userData;
  });
}

function defaultUpdateChannelSettingValue(persistence, settingUniqueId, serverId, channelId, newInternalValue) {
  assert(serverId);
  assert(channelId);
  return persistence.editDataForServer(serverId, serverData => {
    serverData.settings = serverData.settings || {};
    serverData.settings.channelSettings = serverData.settings.channelSettings || {};
    serverData.settings.channelSettings[channelId] = serverData.settings.channelSettings[channelId] || {};
    serverData.settings.channelSettings[channelId][settingUniqueId] = newInternalValue;
    return serverData;
  });
}

function defaultUpdateServerWideSettingValue(persistence, settingUniqueId, serverId, newInternalValue) {
  assert(serverId);
  return persistence.editDataForServer(serverId, serverData => {
    serverData.settings = serverData.settings || {};
    serverData.settings.serverSettings = serverData.settings.serverSettings || {};
    serverData.settings.serverSettings[settingUniqueId] = newInternalValue;

    if (serverData.settings.channelSettings) {
      delete serverData.settings.channelSettings[settingUniqueId];
    }

    return serverData;
  });
}

function defaultUpdateSetting(persistence, settingUniqueId, serverId, channelId, userId, newInternalValue, settingScope) {
  assert(
    settingScope === SettingScope.SERVER
    || settingScope === SettingScope.CHANNEL
    || settingScope === SettingScope.USER);

  if (settingScope === SettingScope.SERVER) {
    return defaultUpdateServerWideSettingValue(persistence, settingUniqueId, serverId, newInternalValue);
  } else if (settingScope === SettingScope.CHANNEL) {
    return defaultUpdateChannelSettingValue(persistence, settingUniqueId, serverId, channelId, newInternalValue);
  } else if (settingScope === SettingScope.USER) {
    return defaultUpdateUserSettingValue(persistence, settingUniqueId, userId, newInternalValue);
  }
}

function sanitizeAndValidateSettingsLeaf(treeNode, uniqueIdsEncountered) {
  const uniqueId = treeNode.uniqueId;
  let errorMessage = '';

  /* Validate */

  if (!treeNode.userFacingName) {
    errorMessage = 'Invalid or nonexistent userFacingName property';
  } else if (!treeNode.uniqueId) {
    errorMessage = 'Invalid or nonexistent uniqueId property.';
  } else if (uniqueIdsEncountered.indexOf(uniqueId) !== -1) {
    errorMessage = 'There is already a setting with that uniqueId';
  } else if (treeNode.defaultUserFacingValue === undefined) {
    errorMessage = 'No defaultUserFacingValue property.';
  } else if (treeNode.uniqueId.indexOf(' ') !== -1) {
    errorMessage = 'Setting unique IDs must not contain spaces.';
  }

  if (errorMessage) {
    throw new Error(`Error validating setting with uniqueId '${uniqueId}': ${errorMessage}`);
  }

  /* Provide defaults */

  if (treeNode.serverSetting === undefined) {
    treeNode.serverSetting = true;
  }

  if (treeNode.channelSetting === undefined) {
    treeNode.channelSetting = true;
  }

  if (treeNode.userSetting === undefined) {
    treeNode.userSetting = true;
  }

  treeNode.convertUserFacingValueToInternalValue = treeNode.convertUserFacingValueToInternalValue || (value => value);
  treeNode.convertInternalValueToUserFacingValue = treeNode.convertInternalValueToUserFacingValue || (value => `${value}`);
  treeNode.validateInternalValue = treeNode.validateInternalValue || (() => true);
  treeNode.updateSetting = treeNode.updateSetting || defaultUpdateSetting;

  /**/

  uniqueIdsEncountered.push(uniqueId);
}

function sanitizeAndValidateSettingsCategory(treeNode, uniqueIdsEncountered) {
  if (!treeNode.userFacingName) {
    throw new Error('A settings category does not have a user facing name.');
  }

  sanitizeAndValidateSettingsTree(treeNode.children, uniqueIdsEncountered);
}

function sanitizeAndValidateSettingsTree(settingsTree, uniqueIdsEncountered) {
  uniqueIdsEncountered = uniqueIdsEncountered || [];

  if (!Array.isArray(settingsTree)) {
    throw new Error('The settings, or a setting category\'s children property, is not an array');
  }
  for (const treeNode of settingsTree) {
    if (treeNode.children) {
      sanitizeAndValidateSettingsCategory(treeNode, uniqueIdsEncountered);
    } else {
      sanitizeAndValidateSettingsLeaf(treeNode, uniqueIdsEncountered);
    }
  }
}

class Settings {
  constructor(persistence, logger, settingsFilePath) {
    this.persistence_ = persistence;
    this.settingsTree_ = [];

    if (settingsFilePath) {
      try {
        this.settingsTree_ = reload(settingsFilePath);
      } catch (err) {
        logger.logFailure('SETTINGS', `Failed to load settings from ${settingsFilePath}`, err);
      }
    }

    sanitizeAndValidateSettingsTree(this.settingsTree_);
  }

  addNodeToRoot(node) {
    if (node) {
      this.settingsTree_.unshift(node);
      sanitizeAndValidateSettingsTree(this.settingsTree_);
    }
  }

  getRawSettingsTree() {
    return this.settingsTree_;
  }

  getTreeNodeForUniqueId(uniqueId) {
    return getTreeNodeForUniqueId(this.settingsTree_, uniqueId);
  }

  async userFacingValueIsValidForSetting(setting, userFacingValue) {
    const internalValue = await setting.convertUserFacingValueToInternalValue(userFacingValue);
    return setting.validateInternalValue(internalValue);
  }

  async getInternalSettingValue(settingUniqueId, serverId, channelId, userId) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);
    if (!treeNode) {
      return undefined;
    }

    const [userData, serverData] = await Promise.all([
      this.persistence_.getDataForUser(userId),
      this.persistence_.getDataForServer(serverId),
    ]);

    const userSetting = getUserSetting(userData, settingUniqueId);
    const channelSetting = getChannelSetting(serverData, channelId, settingUniqueId);
    const serverSetting = getServerSetting(serverData, settingUniqueId);

    if (userSetting !== undefined) {
      return userSetting;
    }
    if (channelSetting !== undefined) {
      return channelSetting;
    }
    if (serverSetting !== undefined) {
      return serverSetting;
    }

    const defaultUserFacingValue = treeNode.defaultUserFacingValue;
    const defaultInternalValue = await treeNode.convertUserFacingValueToInternalValue(defaultUserFacingValue);
    return defaultInternalValue;
  }

  async getUserFacingSettingValue(settingUniqueId, serverId, channelId, userId) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);
    if (!treeNode) {
      return undefined;
    }

    const internalValue = await this.getInternalSettingValue(settingUniqueId, serverId, channelId, userId);
    const userFacingValue = await treeNode.convertInternalValueToUserFacingValue(internalValue);

    return userFacingValue;
  }

  setServerWideSettingValue(settingUniqueId, serverId, newUserFacingValue, userIsServerAdmin) {
    return this.setSettingValue_(settingUniqueId, serverId, undefined, undefined, newUserFacingValue, userIsServerAdmin, SettingScope.SERVER);
  }

  setChannelSettingValue(settingUniqueId, serverId, channelId, newUserFacingValue, userIsServerAdmin) {
    return this.setSettingValue_(settingUniqueId, serverId, channelId, undefined, newUserFacingValue, userIsServerAdmin, SettingScope.CHANNEL);
  }

  setUserSettingValue(settingUniqueId, userId, newUserFacingValue) {
    return this.setSettingValue_(settingUniqueId, undefined, undefined, userId, newUserFacingValue, false, SettingScope.USER);
  }

  async setSettingValue_(settingUniqueId, serverId, channelId, userId, newUserFacingValue, userIsServerAdmin, settingScope) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);
    const newSettingValidationResult = await this.validateNewSetting_(settingUniqueId, newUserFacingValue, userIsServerAdmin, settingScope);
    if (newSettingValidationResult.accepted) {
      await treeNode.updateSetting(
        this.persistence_,
        settingUniqueId,
        serverId,
        channelId,
        userId,
        newSettingValidationResult.newInternalValue,
        settingScope,
      );
    }

    return newSettingValidationResult;
  }

  async validateNewSetting_(settingUniqueId, newUserFacingValue, userIsServerAdmin, settingScope) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);

    if (!treeNode) {
      return createUpdateRejectionResultNoSuchSetting(settingUniqueId);
    }
    if (settingScope !== SettingScope.USER && !userIsServerAdmin) {
      return createUpdateRejectionResultUserNotAdmin(treeNode);
    }
    if (!treeNode.serverSetting && settingScope === SettingScope.SERVER) {
      return createUpdateRejectionResultNotInServer(treeNode);
    }
    if (!treeNode.channelSetting && settingScope === SettingScope.CHANNEL) {
      return createUpdateRejectionResultNotInChannel(treeNode);
    }
    if (!treeNode.userSetting && settingScope === SettingScope.USER) {
      return createUpdateRejectionResultNotForUser(treeNode);
    }

    const newInternalValue = await treeNode.convertUserFacingValueToInternalValue(newUserFacingValue);
    const newValueIsValid = await treeNode.validateInternalValue(newInternalValue);

    if (!newValueIsValid) {
      return createUpdateRejectionResultValueInvalid(newUserFacingValue, treeNode);
    }

    return createUpdateAcceptedResult(newUserFacingValue, newInternalValue, treeNode);
  }
}

module.exports = Settings;
module.exports.UpdateRejectionReason = UpdateRejectionReason;
module.exports.SettingScope = SettingScope;
