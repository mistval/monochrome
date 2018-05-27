const Settings = require('./../core/settings.js');
const Persistence = require('./../core/persistence.js');
const { SettingsConverters, SettingsValidators } = require('./../monochrome.js');
const Logger = require('./mock_objects/mock_logger.js');
const assert = require('assert');
const Storage = require('node-persist');

const KOTOBA_SETTINGS_PATH = `${__dirname}/mock_settings/kotoba.js`;
const NON_ARRAY_SETTINGS_PATH = `${__dirname}/mock_settings/non_array.js`;
const SCOPE_RESTRICTED_SETTINGS_PATH = `${__dirname}/mock_settings/scope_restricted.js`;
const CUSTOM_GETTER_AND_SETTER_SETTINGS_PATH = `${__dirname}/mock_settings/custom_getter_and_setter.js`;

const userSettableSettingInfo = {
  uniqueId: 'quiz/japanese/score_limit',
  defaultUserFacingValue: '10',
  defaultInternalValue: 10,
  validNonDefaultUserFacingValue: '30',
  invalidUserFacingValue: '-1',
  settingsPath: KOTOBA_SETTINGS_PATH,
};

const serverOrChannelOnlySettingInfo = {
  uniqueId: 'quiz/japanese/unanswered_question_limit',
  defaultUserFacingValue: '5',
  defaultInternalValue: 5,
  validNonDefaultUserFacingValue: '10',
  invalidUserFacingValue: '1000',
  settingsPath: KOTOBA_SETTINGS_PATH,
};

const serverOnlySettingInfo = {
  uniqueId: 'server_only',
  defaultUserFacingValue: '16',
  defaultInternalValue: 16,
  validNonDefaultUserFacingValue: '30',
  invalidUserFacingValue: '-1',
  settingsPath: SCOPE_RESTRICTED_SETTINGS_PATH,
};

const channelOnlySettingInfo = {
  uniqueId: 'channel_only',
  defaultUserFacingValue: '16',
  defaultInternalValue: 16,
  validNonDefaultUserFacingValue: '30',
  invalidUserFacingValue: '-1',
  settingsPath: SCOPE_RESTRICTED_SETTINGS_PATH,
};

const userOnlySettingInfo = {
  uniqueId: 'user_only',
  defaultUserFacingValue: '16',
  defaultInternalValue: 16,
  validNonDefaultUserFacingValue: '30',
  invalidUserFacingValue: '-1',
  settingsPath: SCOPE_RESTRICTED_SETTINGS_PATH,
};

const customGetterAndSetterSettingInfo = {
  uniqueId: 'custom',
  defaultUserFacingValue: '16',
  defaultInternalValue: 16,
  validNonDefaultUserFacingValue: '30',
  invalidUserFacingValue: '-1',
  settingsPath: CUSTOM_GETTER_AND_SETTER_SETTINGS_PATH,
};

const NON_EXISTENT_SETTING_NAME_1 = 'rherrhweth';

const SERVER_ID_1 = 'server1';
const CHANNEL_ID_1 = 'channel1';
const USER_ID_1 = 'user1';
const SERVER_ID_2 = 'server2';
const CHANNEL_ID_2 = 'channel2';
const USER_ID_2 = 'user2';

const logger = new Logger();

const persistence = new Persistence();
persistence.init({dir: './test/persistence'});

function createValidSetting1() {
  return {
    userFacingName: 'Answer time limit',
    description: 'This setting controls how many seconds players have to answer a quiz question before I say time\'s up and move on to the next question.',
    allowedValuesDescription: 'A number between 5 and 120 (in seconds)',
    uniqueId: 'quiz/japanese/answer_time_limit2',
    serverOnly: false,
    defaultUserFacingValue: '16',
    convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
    convertInternalValueToUserFacingValue: SettingsConverters.toString,
    validateInternalValue: SettingsValidators.createRangeValidator(5, 120),
  };
}

function createValidSetting2() {
  return {
    userFacingName: 'Score limit',
    description: 'This setting controls how many points the quiz game stops at. When a player scores this many points, the game stops and they win.',
    allowedValuesDescription: 'A whole number between 1 and 10000',
    uniqueId: 'quiz/japanese/score_limit2',
    serverOnly: false,
    defaultUserFacingValue: '10',
    convertUserFacingValueToInternalValue: SettingsConverters.stringToInt,
    convertInternalValueToUserFacingValue: SettingsConverters.toString,
    validateInternalValue: SettingsValidators.createRangeValidator(1, 10000),
  };
}

function createValidSettingNoOptionalFields() {
  return {
    userFacingName: 'Score limit',
    uniqueId: 'quiz/japanese/score_limit3',
    defaultUserFacingValue: '10',
  };
}

function createValidSettingCategorySimple() {
  return {
    userFacingName: 'Timing',
    children: [
      createValidSetting1(),
    ],
  };
}

function createValidSettingCategoryWithDuplicateUniqueIdChildren() {
  return {
    userFacingName: 'Timing',
    children: [
      createValidSetting1(),
      createValidSetting2(),
      createValidSetting2(),
    ],
  };
}

describe('Settings', function() {
  beforeEach(function() {
    Storage.clearSync();
  });
  describe('Constructor', function() {
    it('Doesn\'t allow settings to have spaces in their uniqueIds', function() {
      const setting = createValidSetting1();
      setting.uniqueId = 'ihavea space';
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      assert.throws(() => settings.addNodeToRoot(setting));
    });
    it('Creates an empty settings tree if no file path is provided', function() {
      const settings = new Settings(persistence, logger, undefined);
      assert(settings.getRawSettingsTree().length === 0);
    });
    it('Creates an empty settings tree if an invalid file path is provided', function() {
      const settings = new Settings(persistence, logger, 'rherhweh');
      assert(settings.getRawSettingsTree().length === 0);
    });
    it('Accepts a valid settings tree', function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      settings.addNodeToRoot(createValidSetting1());
    });
    it('Rejects trees containing invalid fields', function() {
      function deleteFieldFromSimpleSettingAndTest(fieldName) {
        const settings = new Settings(persistence, logger, undefined);
        let setting = createValidSetting1();
        delete setting[fieldName];
        assert.throws(() => settings.addNodeToRoot(setting));
      }

      function deleteFieldFromSimpleSettingCategoryAndTest(fieldName) {
        const settings = new Settings(persistence, logger, undefined);
        let category = createValidSettingCategorySimple();
        delete category[fieldName];
        assert.throws(() => settings.addNodeToRoot(category));
      }

      deleteFieldFromSimpleSettingAndTest('userFacingName');
      deleteFieldFromSimpleSettingAndTest('uniqueId');
      deleteFieldFromSimpleSettingAndTest('defaultUserFacingValue');

      deleteFieldFromSimpleSettingCategoryAndTest('userFacingName');
      deleteFieldFromSimpleSettingCategoryAndTest('children');
    });
    it('Rejects tree containing multiple settings with same unique ID', function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      assert.throws(() => settings.addNodeToRoot(createValidSettingCategoryWithDuplicateUniqueIdChildren()));
    });
    it('Provides defaults for unspecified setting fields', function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const node = createValidSettingNoOptionalFields();
      settings.addNodeToRoot(node);

      assert(node.serverSetting === true);
      assert(node.channelSetting === true);
      assert(node.userSetting === true);
      assert(node.convertUserFacingValueToInternalValue);
      assert(node.convertInternalValueToUserFacingValue);
      assert(node.validateInternalValue);
    });
    it('Errors if given settings file containing non-array', function() {
      assert.throws(() => new Settings(persistence, logger, NON_ARRAY_SETTINGS_PATH));
    });
  });
  describe('Accessing the settings tree', function() {
    it('Returns the tree it was given', function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      assert(settings.getRawSettingsTree() === require(KOTOBA_SETTINGS_PATH));
    });
    it('Provides validation', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const setting = require(KOTOBA_SETTINGS_PATH)[0].children[0].children[0];
      const invalidSettingResult = await settings.userFacingValueIsValidForSetting(setting, '4');
      const validSettingResult = await settings.userFacingValueIsValidForSetting(setting, '5');
      assert(!invalidSettingResult);
      assert(validSettingResult);
    });
    it('Finds setting by uniqueId', function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const setting = require(KOTOBA_SETTINGS_PATH)[0].children[0].children[0];
      assert(setting === settings.getTreeNodeForUniqueId(setting.uniqueId));
    });
    it('Returns undefined when searching for nonexistent uniqueId', function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      assert(!settings.getTreeNodeForUniqueId(NON_EXISTENT_SETTING_NAME_1));
    });
  });
  describe('Setting values', function() {
    it('Handles trying to set non-existent setting', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const result = await settings.setServerWideSettingValue(
        NON_EXISTENT_SETTING_NAME_1,
        SERVER_ID_1,
        10,
        false,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.SETTING_DOES_NOT_EXIST);
    });
    it('Handles non-admin trying to set server setting', async function() {
      const settings = new Settings(persistence, logger, serverOnlySettingInfo.settingsPath);
      const result = await settings.setServerWideSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        serverOnlySettingInfo.validNonDefaultUserFacingValue,
        false,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.NOT_ADMIN);
    });
    it('Handles non-admin trying to set channel setting', async function() {
      const settings = new Settings(persistence, logger, serverOnlySettingInfo.settingsPath);
      const result = await settings.setChannelSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        serverOnlySettingInfo.validNonDefaultUserFacingValue,
        false,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.NOT_ADMIN);
    });
    it('Handles trying to set an invalid value', async function() {
      const settings = new Settings(persistence, logger, serverOnlySettingInfo.settingsPath);
      const result = await settings.setServerWideSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        serverOnlySettingInfo.invalidUserFacingValue,
        true,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.INVALID_VALUE);
    });
    it('Handles trying to set a server only setting as a channel setting', async function() {
      const settings = new Settings(persistence, logger, serverOnlySettingInfo.settingsPath);
      const result = await settings.setChannelSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        serverOnlySettingInfo.validNonDefaultUserFacingValue,
        true,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.NOT_ALLOWED_IN_CHANNEL);
    });
    it('Handles trying to set a channel only setting as a user setting', async function() {
      const settings = new Settings(persistence, logger, channelOnlySettingInfo.settingsPath);
      const result = await settings.setUserSettingValue(
        channelOnlySettingInfo.uniqueId,
        USER_ID_1,
        channelOnlySettingInfo.validNonDefaultUserFacingValue,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.NOT_ALLOWED_FOR_USER);
    });
    it('Handles trying to set a user only setting as a server setting', async function() {
      const settings = new Settings(persistence, logger, userOnlySettingInfo.settingsPath);
      const result = await settings.setServerWideSettingValue(
        userOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        userOnlySettingInfo.validNonDefaultUserFacingValue,
        true,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.NOT_ALLOWED_IN_SERVER);
    });
    it('Successfully sets a value server-wide', async function() {
      const settings = new Settings(persistence, logger, serverOnlySettingInfo.settingsPath);

      const setResult = await settings.setServerWideSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        serverOnlySettingInfo.validNonDefaultUserFacingValue,
        true,
      );

      assert(setResult.accepted === true);

      const getResultThatServer = await settings.getUserFacingSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(getResultThatServer === serverOnlySettingInfo.validNonDefaultUserFacingValue);

      const getResultOtherServer = await settings.getUserFacingSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_2,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(getResultOtherServer !== getResultThatServer);
      assert(getResultOtherServer === serverOnlySettingInfo.defaultUserFacingValue);
    });
    it('Successfully sets a value on one channel', async function() {
      const settings = new Settings(persistence, logger, serverOrChannelOnlySettingInfo.settingsPath);

      const setResult = await settings.setChannelSettingValue(
        serverOrChannelOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        serverOrChannelOnlySettingInfo.validNonDefaultUserFacingValue,
        true,
      );

      assert(setResult.accepted === true);

      const getResultThatChannel = await settings.getUserFacingSettingValue(
        serverOrChannelOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(getResultThatChannel === serverOrChannelOnlySettingInfo.validNonDefaultUserFacingValue);

      const getResultOtherChannel = await settings.getUserFacingSettingValue(
        serverOrChannelOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_2,
        USER_ID_1,
      );

      assert(getResultOtherChannel !== getResultThatChannel);
      assert(getResultOtherChannel === serverOrChannelOnlySettingInfo.defaultUserFacingValue);
    });
    it('Successfully sets a value on one user', async function() {
      const settings = new Settings(persistence, logger, userSettableSettingInfo.settingsPath);

      const setResult = await settings.setUserSettingValue(
        userSettableSettingInfo.uniqueId,
        USER_ID_1,
        userSettableSettingInfo.validNonDefaultUserFacingValue,
      );

      assert(setResult.accepted === true);

      const getResultThatUser = await settings.getUserFacingSettingValue(
        userSettableSettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(getResultThatUser === userSettableSettingInfo.validNonDefaultUserFacingValue);

      const getResultOtherUser = await settings.getUserFacingSettingValue(
        userSettableSettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_2,
      );

      assert(getResultOtherUser !== getResultThatUser);
      assert(getResultOtherUser === userSettableSettingInfo.defaultUserFacingValue);
    });
    it('Properly uses provided custom getter and setting functions', async function() {
      const settings = new Settings(persistence, logger, customGetterAndSetterSettingInfo.settingsPath);

      const setResult = await settings.setUserSettingValue(
        customGetterAndSetterSettingInfo.uniqueId,
        USER_ID_1,
        customGetterAndSetterSettingInfo.validNonDefaultUserFacingValue,
      );

      assert(setResult.accepted === true);

      const getResultThatUser = await settings.getUserFacingSettingValue(
        customGetterAndSetterSettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(getResultThatUser === userSettableSettingInfo.validNonDefaultUserFacingValue);
    });
  });
  describe('Getting values', function() {
    it('Gets default internal value correctly', async function() {
      const settings = new Settings(persistence, logger, serverOnlySettingInfo.settingsPath);
      const result = await settings.getInternalSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(result === serverOnlySettingInfo.defaultInternalValue);
    });
    it('Gets default user-facing value correctly', async function() {
      const settings = new Settings(persistence, logger, serverOnlySettingInfo.settingsPath);
      const result = await settings.getUserFacingSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(result === serverOnlySettingInfo.defaultUserFacingValue);
    });
    it('Returns undefined for non-existent setting', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const userFacingResult = await settings.getUserFacingSettingValue(
        NON_EXISTENT_SETTING_NAME_1,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );
      const internalResult = await settings.getInternalSettingValue(
        NON_EXISTENT_SETTING_NAME_1,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(internalResult === undefined);
    });
  });
  describe('Good neighborliness', function() {
    function setOnServer(settings, settingInfo) {
      return settings.setServerWideSettingValue(
        settingInfo.uniqueId,
        SERVER_ID_1,
        settingInfo.validNonDefaultUserFacingValue,
        true,
      );
    }

    function setOnChannel(settings, settingInfo) {
      return settings.setChannelSettingValue(
        settingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        settingInfo.validNonDefaultUserFacingValue,
        true,
      );
    }

    function getSetting(settings, settingInfo) {
      return settings.getUserFacingSettingValue(
        settingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );
    }

    it('Setting a server wide value for one setting doesn\'t interfere with another', async function() {
      const settings = new Settings(persistence, logger, serverOrChannelOnlySettingInfo.settingsPath);

      const setSettingResult1 = await setOnServer(settings, serverOrChannelOnlySettingInfo);
      assert(setSettingResult1.accepted);
      const setSettingResult2 = await setOnServer(settings, userSettableSettingInfo);
      assert(setSettingResult2.accepted);

      const getSettingResult1 = await getSetting(settings, serverOrChannelOnlySettingInfo);
      assert(getSettingResult1 === serverOrChannelOnlySettingInfo.validNonDefaultUserFacingValue);
      const getSettingResult2 = await getSetting(settings, userSettableSettingInfo);
      assert(getSettingResult2 === userSettableSettingInfo.validNonDefaultUserFacingValue);
    });
    it('Setting a channel value for one setting doesn\'t interfere with another', async function() {
      const settings = new Settings(persistence, logger, serverOrChannelOnlySettingInfo.settingsPath);

      const setSettingResult1 = await setOnChannel(settings, serverOrChannelOnlySettingInfo);
      assert(setSettingResult1.accepted);
      const setSettingResult2 = await setOnChannel(settings, userSettableSettingInfo);
      assert(setSettingResult2.accepted);

      const getSettingResult1 = await getSetting(settings, serverOrChannelOnlySettingInfo);
      assert(getSettingResult1 === serverOrChannelOnlySettingInfo.validNonDefaultUserFacingValue);
      const getSettingResult2 = await getSetting(settings, userSettableSettingInfo);
      assert(getSettingResult2 === userSettableSettingInfo.validNonDefaultUserFacingValue);
    });
    it('Setting a channel value for one setting doesn\'t interfere with the existing server value for another', async function() {
      const settings = new Settings(persistence, logger, serverOrChannelOnlySettingInfo.settingsPath);

      const setSettingResult1 = await setOnServer(settings, serverOrChannelOnlySettingInfo);
      assert(setSettingResult1.accepted);
      const setSettingResult2 = await setOnChannel(settings, userSettableSettingInfo);
      assert(setSettingResult2.accepted);

      const getSettingResult1 = await getSetting(settings, serverOrChannelOnlySettingInfo);
      assert(getSettingResult1 === serverOrChannelOnlySettingInfo.validNonDefaultUserFacingValue);
      const getSettingResult2 = await getSetting(settings, userSettableSettingInfo);
      assert(getSettingResult2 === userSettableSettingInfo.validNonDefaultUserFacingValue);;
    });
    it('Setting a server value for one setting doesn\'t interfere with the existing channel value of another', async function() {
      const settings = new Settings(persistence, logger, serverOrChannelOnlySettingInfo.settingsPath);

      const setSettingResult1 = await setOnChannel(settings, serverOrChannelOnlySettingInfo);
      assert(setSettingResult1.accepted);
      const setSettingResult2 = await setOnServer(settings, userSettableSettingInfo);
      assert(setSettingResult2.accepted);

      const getSettingResult1 = await getSetting(settings, serverOrChannelOnlySettingInfo);
      assert(getSettingResult1 === serverOrChannelOnlySettingInfo.validNonDefaultUserFacingValue);
      const getSettingResult2 = await getSetting(settings, userSettableSettingInfo);
      assert(getSettingResult2 === userSettableSettingInfo.validNonDefaultUserFacingValue);
    });
  });
});
