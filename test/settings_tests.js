const Settings = require('./../core/settings.js');
const Persistence = require('./../core/persistence.js');
const { SettingsConverters, SettingsValidators } = require('./../monochrome.js');
const Logger = require('./mock_objects/mock_logger.js');
const assert = require('assert');
const Storage = require('node-persist');

const KOTOBA_SETTINGS_PATH = `${__dirname}/mock_settings/kotoba.js`;

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

function createValidSettingSimple() {
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

function createValidSettingCategorySimple() {
  return {
    userFacingName: 'Timing',
    children: [
      createValidSettingSimple(),
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
      const settings = new Settings(persistence, logger, `${__dirname}/mock_settings/kotoba.js`);
      settings.addNodeToRoot(createValidSettingSimple());
    });
    it('Rejects trees containing invalid fields', function() {
      function deleteFieldFromSimpleAndTest(fieldName) {
        const settings = new Settings(persistence, logger, undefined);
        let setting = createValidSettingSimple();
        delete setting[fieldName];
        assert.throws(() => settings.addNodeToRoot(setting));
      }

      deleteFieldFromSimpleAndTest('userFacingName');
      deleteFieldFromSimpleAndTest('uniqueId');
      deleteFieldFromSimpleAndTest('defaultUserFacingValue');

      const settings = new Settings(persistence, logger, undefined);
      let category = createValidSettingCategorySimple();
      delete category.children;
      assert.throws(() => settings.addNodeToRoot(category));
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
      debugger;

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
      const result = await settings.getUserFacingSettingValue(
        NON_EXISTENT_SETTING_NAME_1,
        SERVER_ID_1,
        CHANNEL_ID_1,
        USER_ID_1,
      );

      assert(result === undefined);
    });
  });
});
