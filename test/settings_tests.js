const Settings = require('./../core/settings.js');
const Persistence = require('./../core/persistence.js');
const { SettingsConverters, SettingsValidators } = require('./../monochrome.js');
const Logger = require('./mock_objects/mock_logger.js');
const assert = require('assert');
const Storage = require('node-persist');

const KOTOBA_SETTINGS_PATH = `${__dirname}/mock_settings/kotoba.js`;

const NO_SETTING_SERVER_ID_1 = 'server1_no_settings';
const NO_SETTING_CHANNEL_ID_1 = 'channel1_no_settings';
const NO_SETTING_USER_ID_1 = 'user1_no_settings';

const logger = new Logger();

const persistence = new Persistence();
persistence.init({dir: './test/persistence'});

Storage.clearSync();

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
  describe('Getting values', function() {
    it('Gets default internal value correctly', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const result = await settings.getInternalSettingValue(
        'quiz/japanese/unanswered_question_limit',
        NO_SETTING_SERVER_ID_1,
        NO_SETTING_CHANNEL_ID_1,
        NO_SETTING_USER_ID_1
      );

      assert(result === 5);
    });
    it('Gets default user-facing value correctly', async function() {
      const settings = new Settings(persistence, logger, KOTOBA_SETTINGS_PATH);
      const result = await settings.getUserFacingSettingValue(
        'quiz/japanese/unanswered_question_limit',
        NO_SETTING_SERVER_ID_1,
        NO_SETTING_CHANNEL_ID_1,
        NO_SETTING_USER_ID_1
      );

      assert(result === '5');
    });
  });
});
