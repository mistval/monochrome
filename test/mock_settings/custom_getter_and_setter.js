const { SettingsConverters, SettingsValidators } = require('./../../monochrome.js');

let settingValue = 16;

module.exports = [
  {
    userFacingName: 'Answer time limit',
    description: 'This setting controls how many seconds players have to answer a quiz question before I say time\'s up and move on to the next question.',
    allowedValuesDescription: 'A number between 5 and 120 (in seconds)',
    uniqueId: 'custom',
    defaultUserFacingValue: '16',
    convertUserFacingValueToInternalValue: SettingsConverters.stringToFloat,
    convertInternalValueToUserFacingValue: SettingsConverters.toString,
    validateInternalValue: SettingsValidators.createRangeValidator(5, 120),
    updateSetting: (persistence, uniqueId, serverId, channelId, userId, newInternalValue) => settingValue = newInternalValue,
    getInternalSettingValue: () => settingValue,
  },
];
