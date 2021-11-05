const assert = require('assert');

/**
 * Strings describing why a setting update failed.
 * @memberof Settings
 * @readonly
 * @enum {string}
 */
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

/**
 * The result of an attempted setting update.
 * @typedef {Object} Settings~SettingUpdateResult
 * @type {Object}
 * @property {boolean} accepted - Whether or not the update was applied.
 * @property {Object} [setting] - The setting that was (or wasn't) updated (only present if a matching setting was found)
 * @property {Settings.UpdateRejectionReason} [reason] - Why the update failed (only present if accepted is false)
 * @property {string} [rejectedUserFacingValue] - The user facing value that was rejected (only present if reason === UpdateRejectionReason.INVALID_VALUE)
 * @property {string} [nonExistentUniqueId] - The unique ID that the caller tried to change the setting value for (only present if reason === UpdateRejectionReason.SETTING_DOES_NOT_EXIST)
 * @property {string} [newUserFacingValue] - The new user facing value that the setting was updated to (only if accepted === true)
 * @property {string} [newInternalValue] - The new internal value that the setting was updated to (only if accepted === true)
 */

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
  } else {
    return defaultUpdateUserSettingValue(persistence, settingUniqueId, userId, newInternalValue);
  }
}

async function defaultGetInternalSettingValue(persistence, setting, serverId, channelId, userId) {
  const [userData, serverData] = await Promise.all([
    persistence.getDataForUser(userId),
    persistence.getDataForServer(serverId),
  ]);

  const userSetting = getUserSetting(userData, setting.uniqueId);
  const channelSetting = getChannelSetting(serverData, channelId, setting.uniqueId);
  const serverSetting = getServerSetting(serverData, setting.uniqueId);

  if (userSetting !== undefined) {
    return userSetting;
  }
  if (channelSetting !== undefined) {
    return channelSetting;
  }
  if (serverSetting !== undefined) {
    return serverSetting;
  }

  const defaultUserFacingValue = setting.defaultUserFacingValue;
  const defaultInternalValue = await setting.convertUserFacingValueToInternalValue(defaultUserFacingValue);
  return defaultInternalValue;
}

function sanitizeAndValidateSettingsLeaf(treeNode, parent, uniqueIdsEncountered, path) {
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

  if (treeNode.requireConfirmation === undefined) {
    treeNode.requireConfirmation = false;
  }

  treeNode.convertUserFacingValueToInternalValue = treeNode.convertUserFacingValueToInternalValue || (value => value);
  treeNode.convertInternalValueToUserFacingValue = treeNode.convertInternalValueToUserFacingValue || (value => `${value}`);
  treeNode.validateInternalValue = treeNode.validateInternalValue || (() => true);
  treeNode.updateSetting = treeNode.updateSetting || defaultUpdateSetting;
  treeNode.getInternalSettingValue = treeNode.getInternalSettingValue || defaultGetInternalSettingValue;
  treeNode.onServerSettingChanged = treeNode.onServerSettingChanged || (() => {});
  treeNode.onChannelSettingChanged = treeNode.onChannelSettingChanged || (() => {});
  treeNode.onUserSettingChanged = treeNode.onUserSettingChanged || (() => {});
  treeNode.path = path;
  treeNode.parent = parent;

  uniqueIdsEncountered.push(uniqueId);
}

function sanitizeAndValidateSettingsCategory(treeNode, parent, uniqueIdsEncountered, path) {
  if (!treeNode.userFacingName) {
    throw new Error('A settings category does not have a user facing name.');
  }

  treeNode.path = path;
  treeNode.parent = parent;
  sanitizeAndValidateSettingsTree(treeNode.children, treeNode, uniqueIdsEncountered, path);
}

function sanitizeAndValidateSettingsTree(settingsTree, parent, uniqueIdsEncountered = [], path = []) {
  if (!Array.isArray(settingsTree)) {
    throw new Error('The settings, or a setting category\'s children property, is not an array');
  }

  for (let i = 0; i < settingsTree.length; i += 1) {
    const treeNode = settingsTree[i];
    const childPath = path.slice();
    childPath.push(i);
    if (treeNode.children) {
      sanitizeAndValidateSettingsCategory(treeNode, parent || settingsTree, uniqueIdsEncountered, childPath);
    } else {
      sanitizeAndValidateSettingsLeaf(treeNode, parent || settingsTree, uniqueIdsEncountered, childPath);
    }
  }
}

function onSettingChanged(treeNode, settingScope, serverId, channelId, userId, newSettingValidationResult) {
  if (settingScope === SettingScope.USER) {
    return treeNode.onUserSettingChanged(treeNode, userId, newSettingValidationResult);
  } else if (settingScope === SettingScope.CHANNEL) {
    return treeNode.onChannelSettingChanged(treeNode, channelId, newSettingValidationResult);
  } else if (settingScope === SettingScope.SERVER) {
    return treeNode.onServerSettingChanged(treeNode, serverId, newSettingValidationResult);
  } else {
    assert(false, 'Unknown setting scope');
  }
}

/**
 * Represents one setting
 * @typedef {Object} Settings~Setting
 * @property {string} userFacingName - The name of the setting
 * @property {string} description - A description of the setting
 * @property {string} allowedValuesDescription - A description of what values the setting allows.
 * @property {string} uniqueId - A unique ID for the setting. Can be anything, and should not be changed.
 * @property {string} defaultUserFacingValue - The default user facing (string) value of the setting.
 * @property {boolean} [userSetting=true] - Whether the setting can be applied on a user-by-user basis.
 * @property {boolean} [channelSetting=true] - Whether the setting can be applied on a channel-by-channel basis.
 * @property {boolean} [serverSetting=true] - Whether the setting can be applied server-wide.
 * @property {function} [convertUserFacingValueToInternalValue] - A function that takes a user facing string value and returns
 *   the value you want to use and store internally. If omitted, no such conversion is performed.
 * @property {function} [convertInternalValueToUserFacingValue] - A function that takes an internal value and returns a user facing
 *   string value. If omitted, the internal value is simply stringified if not already a string.
 * @property {function} [validateInternalValue] - A function that takes an internal setting value and returns true if it's valid,
 *    false if it's not. If omitted, not validation is performed.
 */

/**
 * Represents a category of settings
 * @typedef {Object} Settings~SettingsCategory
 * @property {string} userFacingName - The name of the category
 * @property {Array<(Settings~SettingsCategory|Settings~Setting)>} children - An array of child categories, or settings leafs.
 */

/**
 * Get and set settings with server, channel, and user scope.
 * Settings can be accessed via {@link Monochrome#getSettings}.
 * Settings are specified by creating an array of [SettingsCategory]{@link Settings~SettingsCategory}s
 * and [Setting]{@link Settings~Setting}s in a javascript file and passing the path to that file
 * into the [Monochrome constructor]{@link Monochrome}.
 * For a simple example of a settings definition file, see [the monochrome demo]{@link https://github.com/mistval/monochrome-demo/blob/master/server_settings.js}.
 * For a more advanced example, see [Kotoba's settings definition file]{@link https://github.com/mistval/kotoba/blob/master/src/user_settings.js}.
 * For an example of using the settings module, see the [monochrome demo settings command]{@link https://github.com/mistval/monochrome-demo/blob/master/commands/settings.js}.
 * The demo settings command can be used in your bot. Just edit the configuration section at the top. If you use the demo settings command,
 * you may never need to interact with the settings module directly.
 * @hideconstructor
 */
class Settings {
  constructor(persistence, logger, settingsFilePath) {
    this.persistence_ = persistence;
    this.settingsTree_ = [];
    this.logger = logger.child({
      component: 'Monochrome::Settings',
    });

    if (settingsFilePath) {
      try {
        this.settingsTree_ = require(settingsFilePath);
      } catch (err) {
        this.logger.error({
          event: 'FAILED TO LOAD SETTINGS FILE',
          file: settingsFilePath,
          detail: `Failed to load from ${settingsFilePath}`,
          err,
        });
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

  /**
   * Get the settings tree that you specified in your settings file.
   * It may not be exactly the same due to the application of default values.
   * @returns {Object[]} The array of settings at the root.
   */
  getRawSettingsTree() {
    return this.settingsTree_;
  }

  /**
   * Get the setting or category with the specified unique ID, or undefined if it doesn't exist.
   * @param {string} uniqueId
   * @returns {Object|undefined}
   */
  getTreeNodeForUniqueId(uniqueId) {
    return getTreeNodeForUniqueId(this.settingsTree_, uniqueId);
  }

  /**
   * Check if a user facing value is valid for a setting.
   * @param {Object} setting - The setting, found by calling getTreeNodeForUniqueId or by traversing
   *   the settings tree accessed via the getRawSettingsTree method.
   * @param {string} userFacingValue - The user facing value to check for validity.
   * @returns {boolean}
   */
  async userFacingValueIsValidForSetting(setting, userFacingValue) {
    const internalValue = await setting.convertUserFacingValueToInternalValue(userFacingValue);
    return setting.validateInternalValue(internalValue);
  }

  /**
   * Get the internal value for a setting given the current server, channel, and user context.
   * If there's a matching user setting value, it overrides any matching channel setting value, which overrides
   * any matching server setting value. If there are no server, channel, or user settings values set, the default
   * value specified in the settings definition is returned.
   * @param {string} settingUniqueId
   * @param {string} serverId - The ID of the server where the setting is being accessed.
   * @param {string} channelId - The ID of the channel where the setting is being accessed.
   * @param {string} userId - The ID of the user using the setting.
   * @returns {Object|undefined} The internal value of the setting, or undefined if no setting is found.
   */
  getInternalSettingValue(settingUniqueId, serverId, channelId, userId) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);
    if (!treeNode) {
      return undefined;
    }

    return treeNode.getInternalSettingValue(this.persistence_, treeNode, serverId, channelId, userId);
  }

  /**
   * Get the user facing value for a setting given the current server, channel, and user context.
   * If there's a matching user setting value, it overrides any matching channel setting value, which overrides
   * any matching server setting value. If there are no server, channel, or user settings values set, the default
   * value specified in the settings definition is returned.
   * @param {string} settingUniqueId
   * @param {string} serverId - The ID of the server where the setting is being accessed.
   * @param {string} channelId - The ID of the channel where the setting is being accessed.
   * @param {string} userId - The ID of the user using the setting.
   * @returns {string|undefined} The user facing value of the setting, or undefined if no setting is found.
   */
  async getUserFacingSettingValue(settingUniqueId, serverId, channelId, userId) {
    const treeNode = getTreeNodeForUniqueId(this.settingsTree_, settingUniqueId);
    if (!treeNode) {
      return undefined;
    }

    const internalValue = await this.getInternalSettingValue(settingUniqueId, serverId, channelId, userId);
    const userFacingValue = await treeNode.convertInternalValueToUserFacingValue(internalValue);

    return userFacingValue;
  }

  /**
   * Set a setting value server wide. This also wipes out any channel settings in the server
   * for the setting with the specified unique ID. User settings are unaffected.
   * @param {string} settingUniqueId
   * @param {string} serverId - The ID of the server where the setting is being set.
   * @param {string} newUserFacingValue - The user facing value of the new setting value.
   * @param {boolean} userIsServerAdmin - Whether or not the user is a server admin.
   * @returns {Settings~SettingUpdateResult}
   */
  async setServerWideSettingValue(settingUniqueId, serverId, newUserFacingValue, userIsServerAdmin) {
    return this.setSettingValue_(settingUniqueId, serverId, undefined, undefined, newUserFacingValue, userIsServerAdmin, SettingScope.SERVER);
  }

  /**
   * Set a setting value for a channel.
   * @param {string} settingUniqueId
   * @param {string} serverId - The ID of the server where the setting is being set.
   * @param {string} channelId - The ID of the channel where the setting is being set.
   * @param {string} newUserFacingValue - The user facing value of the new setting value.
   * @param {boolean} userIsServerAdmin - Whether or not the user is a server admin.
   * @returns {Settings~SettingUpdateResult} The result of the attempt to update the setting.
   */
  async setChannelSettingValue(settingUniqueId, serverId, channelId, newUserFacingValue, userIsServerAdmin) {
    return this.setSettingValue_(settingUniqueId, serverId, channelId, undefined, newUserFacingValue, userIsServerAdmin, SettingScope.CHANNEL);
  }

  /**
   * Reset all settings for a user.
   * @param {string} userId - The ID for the user to reset settings for.
   */
  async resetUserSettings(userId) {
    return this.persistence_.editDataForUser(userId, userData => {
      delete userData.settings;
      return userData;
    });
  }

  /**
   * Reset all settings (both server-wide and channel-specific settings) in a server.
   * @param {string} userId - The ID for the user to reset settings for.
   */
  async resetServerAndChannelSettings(serverId) {
    return this.persistence_.editDataForServer(serverId, serverData => {
      delete serverData.settings;
      return serverData;
    });
  }

  /**
   * Set a setting value for a user.
   * @param {string} settingUniqueId
   * @param {string} userId - The ID of the server to set the setting value for.
   * @param {string} newUserFacingValue - The user facing value of the new setting value.
   * @returns {Settings~SettingUpdateResult} The result of the attempt to update the setting.
   */
  async setUserSettingValue(settingUniqueId, userId, newUserFacingValue) {
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
      await onSettingChanged(
        treeNode,
        settingScope,
        serverId,
        channelId,
        userId,
        newSettingValidationResult,
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
