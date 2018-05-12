const Settings = require('./../core/settings.js');
const Persistence = require('./../core/persistence.js');
const { SettingsConverters, SettingsValidators } = require('./../monochrome.js');
const Logger = require('./mock_objects/mock_logger.js');
const assert = require('assert');
const Storage = require('node-persist');

const KOTOBA_SETTINGS_PATH = `${__dirname}/mock_settings/kotoba.js`;
const NON_ARRAY_SETTINGS_PATH = `${__dirname}/mock_settings/non_array.js`;

const serverOnlySettingInfo = {
  uniqueId: 'quiz/japanese/unanswered_question_limit',
  defaultUserFacingValue: '5',
  defaultInternalValue: 5,
  validNonDefaultUserFacingValue: '10',
  invalidUserFacingValue: '1000',
};

const userSettableSettingInfo = {
  uniqueId: 'quiz/japanese/score_limit',
  defaultUserFacingValue: '10',
  defaultInternalValue: 10,
  validNonDefaultUserFacingValue: '30',
  invalidUserFacingValue: '-1',
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

      assert(node.serverOnly === false);
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
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
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
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const result = await settings.setChannelSettingValue(
        serverOnlySettingInfo.uniqueId,
        CHANNEL_ID_1,
        SERVER_ID_1,
        serverOnlySettingInfo.validNonDefaultUserFacingValue,
        false,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.NOT_ADMIN);
    });
    it('Handles trying to set an invalid value', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const result = await settings.setServerWideSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        serverOnlySettingInfo.invalidUserFacingValue,
        true,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.INVALID_VALUE);
    });
    it('Handles trying to set a server only setting as a user setting', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const result = await settings.setUserSettingValue(
        serverOnlySettingInfo.uniqueId,
        USER_ID_1,
        serverOnlySettingInfo.validNonDefaultUserFacingValue,
      );

      assert(result.accepted === false);
      assert(result.reason === Settings.UpdateRejectionReason.SERVER_ONLY);
    });
    it('Successfully sets a value server-wide', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);

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
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);

      const setResult = await settings.setChannelSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        serverOnlySettingInfo.validNonDefaultUserFacingValue,
        true,
      );

      assert(setResult.accepted === true);

      const getResultThatChannel = await settings.getUserFacingSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(getResultThatChannel === serverOnlySettingInfo.validNonDefaultUserFacingValue);

      const getResultOtherChannel = await settings.getUserFacingSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_2,
        USER_ID_1,
      );

      assert(getResultOtherChannel !== getResultThatChannel);
      assert(getResultOtherChannel === serverOnlySettingInfo.defaultUserFacingValue);
    });
    it('Successfully sets a value on one user', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);

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
  });
  describe('Getting values', function() {
    it('Gets default internal value correctly', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const result = await settings.getInternalSettingValue(
        serverOnlySettingInfo.uniqueId,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(result === serverOnlySettingInfo.defaultInternalValue);
    });
    it('Gets default user-facing value correctly', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
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
});
