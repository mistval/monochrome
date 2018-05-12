const reload = require('require-reload')(require);

const UpdateRejectionReason = {
  NOT_ADMIN: 1,
  INVALID_VALUE: 2,
  SETTING_DOES_NOT_EXIST: 3,
  SERVER_ONLY: 4,
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

function createUpdateRejectionResultServerOnly(treeNode) {
  return {
    accepted: false,
    reason: UpdateRejectionReason.SERVER_ONLY,
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
      const childTreeResult = getTreeNodeForUniqueIdHelper(element.children, settingUniqueId);
      if (childTreeResult) {
        return childTreeResult;
      }
    }
  }

  return undefined;
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
  }

  if (errorMessage) {
    throw new Error(`Error validating setting with uniqueId '${uniqueId}': ${errorMessage}`);
  }

  /* Provide defaults */

  if (treeNode.serverOnly === undefined) {
    treeNode.serverOnly = false;
  }

  treeNode.convertUserFacingValueToInternalValue = treeNode.convertUserFacingValueToInternalValue || (value => value);
  treeNode.convertInternalValueToUserFacingValue = treeNode.convertUserFacingValueToInternalValue || (value => `${value}`);
  treeNode.validateInternalValue = treeNode.validateInternalValue || (() => true);

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
  constructor(persistence, settingsFilePath, logger) {
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
    this.settingsTree_.shift(node);
    sanitizeAndValidateSettingsTree(this.settingsTree_);
  }

  getRawSettingsTree() {
    return this.settingsTree_;
  }

  async getInternalSettingValue(settingUniqueId, serverId, channelId, userId, converterParams) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);
    if (!treeNode) {
      return undefined;
    }

    const [userData, serverData] = await Promise.all([
      this.persistence_.getUserData(userId),
      this.persistence_.getServerData(serverId),
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
    const defaultInternalValue = await treeNode.convertUserFacingValueToInternalValue(defaultUserFacingValue, converterParams);
    return defaultInternalValue;
  }

  async getUserFacingSettingValue(settingUniqueId, serverId, channelId, userId, converterParams) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);
    if (!treeNode) {
      return undefined;
    }

    const internalValue = await this.getInternalSettingValue(settingUniqueId, serverId, channelId, userId, converterParams);
    const userFacingValue = await treeNode.convertInternalValueToUserFacingValue(internalValue, converterParams);

    return userFacingValue;
  }

  async setServerWideSettingValue(settingUniqueId, serverId, newUserFacingValue, userIsServerAdmin, params) {
    const newSettingValidationResult = this.validateNewSetting_(settingUniqueId, newUserFacingValue, userIsServerAdmin, false, params);
    if (newSettingValidationResult.accepted) {
      await this.persistence_.editServerData(serverId, serverData => {
        serverData = serverData || {};
        serverData.settings = serverData.settings || {};
        serverData.settings.serverSettings = serverData.settings.serverSettings || {};
        serverData.settings.serverSettings[settingUniqueId] = newInternalValue;
        delete serverData.settings.channelSettings;
        return serverData;
      });
    }

    return newSettingValidationResult;
  }

  async setChannelSettingValue(settingUniqueId, serverId, channelId, newUserFacingValue, userIsServerAdmin, params) {
    const newSettingValidationResult = this.validateNewSetting_(settingUniqueId, newUserFacingValue, userIsServerAdmin, params);
    if (newSettingValidationResult.accepted) {
      await this.persistence_.editServerData(serverId, serverData => {
        serverData = serverData || {};
        serverData.settings = serverData.settings || {};
        serverData.settings.channelSettings = serverData.settings.channelSettings || {};
        serverData.settings.channelSettings[channelId] = serverData.settings.channelSetting[channelId] || {};
        serverData.settings.channelSettings[channelId] = newSettingValidationResult.newInternalValue;
        return serverData;
      });
    }

    return newSettingValidationResult;
  }

  async setUserSettingValue(settingUniqueId, userId, newUserFacingValue, params) {
    const newSettingValidationResult = this.validateNewSetting_(settingUniqueId, newUserFacingValue, false, true, params);
    if (newSettingValidationResult.accepted) {
      await this.persistence_.editUserData(userId, userData => {
        userData = userData || {};
        userData.settings = userData.settings || {};
        userData.settings.global = userData.settings.global || {};
        userData.settings.global[settingUniqueId] = newSettingValidationResult.newInternalValue;
        return userData;
      });
    }

    return newSettingValidationResult;
  }

  async validateNewSetting_(settingUniqueId, newUserFacingValue, userIsServerAdmin, isUserSetting, params) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);

    if (!treeNode) {
      return createUpdateRejectionResultNoSuchSetting(settingUniqueId);
    }
    if (!isUserSetting && !userIsServerAdmin) {
      return createUpdateRejectionResultUserNotAdmin(treeNode);
    }
    if (isUserSetting && treeNode.serverOnly) {
      return createUpdateRejectionResultServerOnly(treeNode);
    }

    const newInternalValue = await treeNode.convertUserFacingValueToInternalValue(newUserFacingValue, params);
    const newValueIsValid = await treeNode.validateInternalValue(newInternalValue, params);

    if (!newValueIsValid) {
      return createUpdateRejectionResultValueInvalid(newUserFacingValue, treeNode);
    }

    return createUpdateAcceptedResult(newUserFacingValue, newInternalValue, treeNode);
  }
}
