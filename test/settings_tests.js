const assert = require('assert');
const AbstractSettingsElement = require('./../core/abstract_setting_element.js');
const Setting = require('./../core/setting.js');

class MockSettingsElementMissingFunction extends AbstractSettingsElement {
  constructor() {
    super();
  }

  getChildForFullyQualifiedUserFacingName() {}
  getFullyQualifiedUserFacingName() {}
  getConfigurationInstructionsBotContent() {}
}

let validIntegerSetting = {
  'type': 'SETTING',
  'userFacingName': 'countdown_start',
  'description': 'This setting controls what number I\'ll count down from when you use the bot!countdown command.',
  'valueType': 'INTEGER',
  'defaultDatabaseFacingValue': 10,
  'allowedDatabaseFacingValues': 'Range(1, 10)',
};

let validFloatSetting = {
  'type': 'SETTING',
  'userFacingName': 'Fraction',
  'description': 'My favorite fraction',
  'valueType': 'FLOAT',
  'defaultDatabaseFacingValue': 1.0,
  'allowedDatabaseFacingValues': [1.0, 2.0],
};

let validStringSetting = {
  'type': 'SETTNG',
  'userFacingName': 'name',
  'description': 'My name.',
  'valueType': 'STRING',
  'defaultDatabaseFacingValue': 'Tom',
};

let validBooleanSetting = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'description': 'Whether I should act dumb or not.',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let defaultValueOutOfAllowedRangeSetting1 = {
  'type': 'SETTING',
  'userFacingName': 'Fraction',
  'description': 'My favorite fraction',
  'valueType': 'FLOAT',
  'defaultDatabaseFacingValue': 3.0,
  'allowedDatabaseFacingValues': [1.0, 2.0],
};

let defaultValueOutOfAllowedRangeSetting2 = {
  'type': 'SETTING',
  'userFacingName': 'countdown_start',
  'description': 'This setting controls what number I\'ll count down from when you use the bot!countdown command.',
  'valueType': 'INTEGER',
  'defaultDatabaseFacingValue': 11,
  'allowedDatabaseFacingValues': 'Range(1, 10)',
};

let invalidValueTypeSetting1 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'description': 'Whether I should act dumb or not.',
  'valueType': 'BOOLrgrEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidValueTypeSetting2 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'description': 'Whether I should act dumb or not.',
  'defaultDatabaseFacingValue': true,
};

let invalidDescriptionSetting1 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'description': 5,
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidDescriptionSetting2 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidUserFacingName1 = {
  'type': 'SETTING',
  'description': 'description',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidUserFacingName2 = {
  'type': 'SETTING',
  'userFacingName': 5,
  'description': 'description',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidUserFacingName3 = {
  'type': 'SETTING',
  'userFacingName': 'name.name',
  'description': 'description',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidDatabaseFacingName1 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'databaseFacingName': 5,
  'description': 'Whether I should act dumb or not.',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidDatabaseFacingName2 = {
  'type': 'SETTING',
  'userFacingName': 'act_dumb',
  'databaseFacingName': 'lol.fe',
  'description': 'Whether I should act dumb or not.',
  'valueType': 'BOOLEAN',
  'defaultDatabaseFacingValue': true,
};

let invalidDatabaseFacingValue1 = {
  'type': 'SETTING',
  'userFacingName': 'name',
  'description': 'My name.',
  'valueType': 'STRING',
};

let invalidDatabaseFacingValues1 = {
  'type': 'SETTING',
  'userFacingName': 'name',
  'description': 'My name.',
  'valueType': 'STRING',
  'allowedDatabaseFacingValues': 5,
};

let invalidDatabaseFacingValues2 = {
  'type': 'SETTING',
  'userFacingName': 'name',
  'description': 'My name.',
  'valueType': 'STRING',
  'allowedDatabaseFacingValues': 'Range(0, 10)',
};


let validSettings = [
  validIntegerSetting,
  validFloatSetting,
  validStringSetting,
  validBooleanSetting,
];

const MOCK_NON_EMPTY_QUALIFICATION_WO_NAME = 'categories';
const SEPARATOR = '.';
const SETTINGS_COMMAND_ALIAS = '!settings';
const MOCK_CHANNEL_ID1 = '111';
const MOCK_CHANNEL_ID2 = '222';
const MOCK_CHANNEL_ID3 = '333';

function createSetting(settingBlob) {
  return new Setting(settingBlob, MOCK_NON_EMPTY_QUALIFICATION_WO_NAME, SEPARATOR, 0, SETTINGS_COMMAND_ALIAS);
}

describe('Abstract settings element', function() {
  describe('constructor()', function() {
    it('throws if child is missing a function', function() {
      assert.throws(() => new MockSettingsElementMissingFunction());
    });
  });
});

describe('Setting', function() {
  describe('constructor()', function() {
    it('Constructs valid settings without throwing.', function() {
      for (let setting of validSettings) {
        createSetting(setting);
      }
    });
    it('Throws if the value type is invalid', function() {
      assert.throws(() => createSetting(invalidValueTypeSetting1));
      assert.throws(() => createSetting(invalidValueTypeSetting2));
    });
    it('Throws for invalid setting description', function() {
      assert.throws(() => createSetting(invalidDescriptionSetting1));
      assert.throws(() => createSetting(invalidDescriptionSetting2));
    });
    it('Throws for invalid user facing name', function() {
      assert.throws(() => createSetting(invalidUserFacingName1));
      assert.throws(() => createSetting(invalidUserFacingName2));
      assert.throws(() => createSetting(invalidUserFacingName3));
    });
    it('Throws for invalid database facing name', function() {
      assert.throws(() => createSetting(invalidDatabaseFacingName1));
      assert.throws(() => createSetting(invalidDatabaseFacingName2));
    });
    it('Throws for no database facing value', function() {
      assert.throws(() => createSetting(invalidDatabaseFacingValue1));
    });
    it('Throws for invalid database facing values', function() {
      assert.throws(() => createSetting(invalidDatabaseFacingValues1));
      assert.throws(() => createSetting(invalidDatabaseFacingValues2));
    });
    it('Throws if the defaultDatabaseFacingValue is not in allowedDatabaseFacingValues', function() {
      assert.throws(() => createSetting(defaultValueOutOfAllowedRangeSetting1));
      assert.throws(() => createSetting(defaultValueOutOfAllowedRangeSetting2));
    });
  });
  describe('Resolution', function() {
    it('Resolves or fails to resolve as appropriate', function() {
      let userFacingName = 'name';
      let settingData = {
        'type': 'SETTING',
        'userFacingName': userFacingName,
        'description': 'My name.',
        'valueType': 'STRING',
        'defaultDatabaseFacingValue': 'Tom',
      };
      let setting = createSetting(settingData);
      let settingName = MOCK_NON_EMPTY_QUALIFICATION_WO_NAME + SEPARATOR + userFacingName;
      assert(setting.getFullyQualifiedUserFacingName() === settingName);
      let notSettingName1 = MOCK_NON_EMPTY_QUALIFICATION_WO_NAME + SEPARATOR + 'fff';
      let notSettingName2 = MOCK_NON_EMPTY_QUALIFICATION_WO_NAME + SEPARATOR;
      let notSettingName3 = SEPARATOR + userFacingName;
      let notSettingName4 = userFacingName;
      let notSettingName5 = userFacingName + SEPARATOR;
      let notSettingName6 = MOCK_NON_EMPTY_QUALIFICATION_WO_NAME + SEPARATOR + userFacingName + SEPARATOR;
      assert(setting.getChildForFullyQualifiedUserFacingName(settingName));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName1));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName2));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName3));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName4));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName5));
      assert(!setting.getChildForFullyQualifiedUserFacingName(notSettingName6));
    });
  });
  describe('Getting/setting value', function() {
    it('Returns default value if nothing in database', function() {
      let setting = createSetting(validIntegerSetting);
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, {}) === validIntegerSetting.defaultDatabaseFacingValue);
    });
    it('Returns server setting value if no channel value', function() {
      const serverSettingValue = 5;
      let setting = createSetting(validIntegerSetting);
      let settings = {serverSettings: {}};
      settings.serverSettings[setting.getFullyQualifiedUserFacingName()] = serverSettingValue;
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === serverSettingValue);
    });
    it('Returns server setting value if no channel value for this channel', function() {
      const serverSettingValue = 5;
      const channelSettingValue = 3;
      const fakeChannelId = 'fake_channel';
      let setting = createSetting(validIntegerSetting);
      let settings = {serverSettings: {}, channelSettings: {}};
      settings.channelSettings[fakeChannelId] = {};
      settings.serverSettings[setting.getFullyQualifiedUserFacingName()] = serverSettingValue;
      settings.channelSettings[fakeChannelId][setting.getFullyQualifiedUserFacingName()] = channelSettingValue;
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === serverSettingValue);
    });
    it('Returns channel setting value if it exists', function() {
      const serverSettingValue = 5;
      const channelSettingValue = 3;
      let setting = createSetting(validIntegerSetting);
      let settings = {serverSettings: {}, channelSettings: {}};
      settings.channelSettings[MOCK_CHANNEL_ID1] = {};
      settings.serverSettings[setting.getFullyQualifiedUserFacingName()] = serverSettingValue;
      settings.channelSettings[MOCK_CHANNEL_ID1][setting.getFullyQualifiedUserFacingName()] = channelSettingValue;
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === channelSettingValue);
    });
    it('Sets the channel value correctly for here', function() {
      const newValue = 8;
      let setting = createSetting(validIntegerSetting);
      let settings = {};
      setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, [], settings, newValue, 'here');
      assert(settings.channelSettings[MOCK_CHANNEL_ID1][setting.getFullyQualifiedUserFacingName()] === newValue);
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === newValue);
    });
    it('Sets the channel value correctly for all', function() {
      const newValue = 8;
      let setting = createSetting(validIntegerSetting);
      let settings = {};
      setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, [], settings, newValue, 'all');
      assert(settings.serverSettings[setting.getFullyQualifiedUserFacingName()] === newValue);
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === newValue);
    });
    it('Sets the channel value correctly for specified channels', function() {
      const newValue = 8;
      let setting = createSetting(validIntegerSetting);
      let settings = {};
      let channelsInGuild = [MOCK_CHANNEL_ID1, MOCK_CHANNEL_ID2, MOCK_CHANNEL_ID3].map(id => { return {id: id}; });
      let channelString = `<#${MOCK_CHANNEL_ID1}> <#${MOCK_CHANNEL_ID2}>`;
      setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, channelsInGuild, settings, newValue, channelString);
      assert(settings.channelSettings[MOCK_CHANNEL_ID1][setting.getFullyQualifiedUserFacingName()] === newValue);
      assert(settings.channelSettings[MOCK_CHANNEL_ID2][setting.getFullyQualifiedUserFacingName()] === newValue);
      assert(!settings.channelSettings[MOCK_CHANNEL_ID3]);
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === newValue);
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID2, settings) === newValue);
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID3, settings) === validIntegerSetting.defaultDatabaseFacingValue);
    });
    it('Does not allow setting a value that\'s not in the allowedDatabaseFacingValues array, if there is one', function() {
      const newValue = 999;
      let setting = createSetting(validFloatSetting);
      let settings = {};
      setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, [], settings, newValue, 'all');
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === validFloatSetting.defaultDatabaseFacingValue);
      assert(!settings.serverSettings[setting.getFullyQualifiedUserFacingName()]);
    });
    it('Does allow setting a value that\'s in the allowedDatabaseFacingValues array, if there is one', function() {
      const newValue = validFloatSetting.allowedDatabaseFacingValues[1];
      let setting = createSetting(validFloatSetting);
      let settings = {};
      setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, [], settings, newValue, 'all');
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === newValue);
      assert(settings.serverSettings[setting.getFullyQualifiedUserFacingName()] === newValue);
    });
    it('Does not allow setting a value that\'s not in the allowable range, if there is one', function() {
      const newValue = 999;
      let setting = createSetting(validIntegerSetting);
      let settings = {};
      setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, [], settings, newValue, 'all');
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === validIntegerSetting.defaultDatabaseFacingValue);
      assert(!settings.serverSettings[setting.getFullyQualifiedUserFacingName()]);
    });
    it('Does allow setting a value that is in the allowable range, if there is one', function() {
      const newValue = 5;
      let setting = createSetting(validIntegerSetting);
      let settings = {};
      setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, [], settings, newValue, 'all');
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === newValue);
      assert(settings.serverSettings[setting.getFullyQualifiedUserFacingName()] === newValue);
    });
    it('Does not allow non-boolean setting for boolean setting', function() {
      const newValue = 'ffffff';
      let setting = createSetting(validBooleanSetting);
      let settings = {};
      setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, [], settings, newValue, 'all');
      assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === validBooleanSetting.defaultDatabaseFacingValue);
      assert(!settings.serverSettings[setting.getFullyQualifiedUserFacingName()]);
    });
    it('Does allow boolean setting for boolean setting', function() {
      let values = [!validBooleanSetting.defaultDatabaseFacingValue, validBooleanSetting.defaultDatabaseFacingValue];
      for (let value of values) {
        let setting = createSetting(validBooleanSetting);
        let settings = {};
        setting.setNewValueFromUserFacingString(MOCK_CHANNEL_ID1, [], settings, value.toString(), 'all');
        assert(setting.getCurrentDatabaseFacingValue(MOCK_CHANNEL_ID1, settings) === value);
        assert(settings.serverSettings[setting.getFullyQualifiedUserFacingName()] === value);
      }
    });
  });
  describe('Configuration instructions', function() {
    it('Creates embeds for configuration instructions', function() {
      for (let settingData of validSettings) {
        let setting = createSetting(settingData);
        let botContent = setting.getConfigurationInstructionsBotContent(MOCK_CHANNEL_ID1, {}, setting.getFullyQualifiedUserFacingName());
        assert(botContent.embed);
      }
    });
  });
});