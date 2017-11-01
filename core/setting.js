const assert = require('assert');

const STRING_VALUE_TYPE = 'STRING';
const INTEGER_VALUE_TYPE = 'INTEGER';
const FLOAT_VALUE_TYPE = 'FLOAT';
const BOOLEAN_VALUE_TYPE = 'BOOLEAN';
const CUSTOM_VALUE_TYPE = 'CUSTOM';
const prettyPrintForValueType = {};
prettyPrintForValueType[STRING_VALUE_TYPE] = 'Text';
prettyPrintForValueType[INTEGER_VALUE_TYPE] = 'Whole number';
prettyPrintForValueType[FLOAT_VALUE_TYPE] = 'Number';
prettyPrintForValueType[BOOLEAN_VALUE_TYPE] = 'True or false';
prettyPrintForValueType[CUSTOM_VALUE_TYPE] = '';

const arbitraryAllowedValuesForType = {};
arbitraryAllowedValuesForType[STRING_VALUE_TYPE] = 'Any text';
arbitraryAllowedValuesForType[INTEGER_VALUE_TYPE] = 'Any whole number';
arbitraryAllowedValuesForType[FLOAT_VALUE_TYPE] = 'Any number';
arbitraryAllowedValuesForType[BOOLEAN_VALUE_TYPE] = 'True or false';
arbitraryAllowedValuesForType[CUSTOM_VALUE_TYPE] = '';


class Range {
  constructor(lower, upper) {
    this.lower_ = lower;
    this.upper_ = upper;
  }

  getLower() {
    return this.lower_;
  }

  getUpper() {
    return this.upper_;
  }

  isWithinRange(value) {
    return value >= this.lower_ && value <= this.upper_;
  }
}

function extractChannelIdsFromString(str) {
  return str.replace(/<#/g, '').replace(/>/g, '').split(' ');
}

function findChannelsNotInGuild(channelIds, guild) {
  return channelIds.filter(channelId => {
    return !guild.channels.find(guildChannel => guildChannel.id === channelId);
  });
}

function throwError(baseString, failedBlob) {
  throw new Error(baseString + ' Failed blob: \n' + JSON.stringify(failedBlob, null, 2));
}

class ValueTypeStrategy {
  constructor(convertUserFacingValueToDatabaseFacingValue, convertDatabaseFacingValueToUserFacingValue, validateUserFacingValue) {
    this.convertUserFacingValueToDatabaseFacingValue = convertUserFacingValueToDatabaseFacingValue;
    this.convertDatabaseFacingValueToUserFacingValue = convertDatabaseFacingValueToUserFacingValue;
    this.validateUserFacingValue = validateUserFacingValue;
  }
}

let strategyForValueType = {};
strategyForValueType[STRING_VALUE_TYPE] = new ValueTypeStrategy(
  (bot, msg, value) => value,
  (bot, msg, value) => value.toString(),
  (bot, msg, value) => true
);
strategyForValueType[INTEGER_VALUE_TYPE] = new ValueTypeStrategy(
  (bot, msg, value) => parseInt(value),
  (bot, msg, value) => value.toString(),
  (bot, msg, value) => typeof parseInt(value) === typeof 1
);
strategyForValueType[FLOAT_VALUE_TYPE] = new ValueTypeStrategy(
  (bot, msg, value) => parseFloat(value),
  (bot, msg, value) => value.toString(),
  (bot, msg, value) => typeof parseFloat(value) === typeof 1.5
);
strategyForValueType[BOOLEAN_VALUE_TYPE] =  new ValueTypeStrategy(
  (bot, msg, value) => value.toLowerCase() === 'true',
  (bot, msg, value) => value.toString(),
  (bot, msg, value) => value.toLowerCase() === 'true' || value.toLowerCase() === 'false'
);

function clearValueFromChannelSettings(channelSettings, settingName) {
  if (channelSettings) {
    let keys = Object.keys(channelSettings);
    for (let key of keys) {
      delete channelSettings[key][settingName];
    }
  }
}

class Setting {
  constructor(settingsBlob, qualificationWithoutName, settingsCategorySeparator, colorForEmbeds, serverSettingsCommand) {
    this.colorForEmbeds_ = colorForEmbeds;
    this.serverSettingsCommand_ = serverSettingsCommand;
    let hasAllCustomFields = settingsBlob.customAllowedValuesDescription
      && settingsBlob.customValidateDatabaseFacingValueFunction
      && settingsBlob.customConvertFromUserToDatabaseFacingValue
      && settingsBlob.customConvertFromDatabaseToUserFacingValue
      && settingsBlob.customUserFacingExampleValues
      && settingsBlob.customValueTypeDescription;
    if ((!settingsBlob.valueType || settingsBlob.valueType === CUSTOM_VALUE_TYPE) && !hasAllCustomFields) {
      throwError('Setting has a custom (or no specified) value type, but does not define all the required custom fields. It must define: '
        + 'customValidateDatabaseFacingValue '
        + 'customConvertFromUserToDatabaseFacingValue '
        + 'customConvertFromDatabaseToUserFacingValue '
        + 'customUserFacingExampleValues '
        + 'customValueTypeDescription ');
    } else if (!settingsBlob.description || typeof settingsBlob.description !== typeof '') {
      throwError('Setting needs a description. It either doesn\'t have one, or it has one that isn\'t a string', settingsBlob);
    } else if (settingsBlob.valueType && Object.keys(prettyPrintForValueType).indexOf(settingsBlob.valueType) === -1) {
      throwError('Setting needs a value type. it either doesn\'t have one, or it has one that\'s invalid. It must be one of: ' + Object.keys(prettyPrintForValueType).join(', '), settingsBlob);
    } else if (!settingsBlob.name || typeof settingsBlob.name !== typeof '') {
      throwError('Setting does not have a name, or it is invalid. It must be a non-empty string.', settingsBlob);
    } else if (settingsBlob.name.indexOf(settingsCategorySeparator) !== -1) {
      throwError('A setting has an invalid name. It must not contain a ' + settingsCategorySeparator, settingsBlob);
    } else if (settingsBlob.name.indexOf(' ') !== -1) {
      throwError('A setting has an invalid name. It must not contain a space.', settingsBlob);
    } else if (!('defaultDatabaseFacingValue' in settingsBlob)) {
      throwError('A setting has no defaultDatabaseFacingValue value. It must have one.', settingsBlob);
    }
    this.customValueTypeDescription_ = settingsBlob.customValueTypeDescription;
    this.isSetting = true;
    this.description_ = settingsBlob.description;
    this.valueType_ = settingsBlob.valueType;
    this.customAllowedValuesString_ = settingsBlob.customAllowedValuesDescription;;
    this.name_ = settingsBlob.name;
    this.allowedDatabaseFacingValues_ = settingsBlob.allowedDatabaseFacingValues;
    this.fullyQualifiedName_ = qualificationWithoutName + settingsCategorySeparator + this.name_;
    this.defaultDatabaseFacingValue_ = settingsBlob.defaultDatabaseFacingValue;
    this.customUserFacingExampleValues_ = settingsBlob.customUserFacingExampleValues;

    let hasCustomFunctions = settingsBlob.customConvertFromDatabaseToUserFacingValue
      && settingsBlob.customConvertFromUserFacingToDatabaseFacingValue
      && settingsBlob.customValidateDatabaseFacingValue;
    if (this.valueType_ === CUSTOM_VALUE_TYPE && !hasCustomFunctions) {
      throwError('A setting with a custom value type must have all of: customConvertFromDatabaseToUserFacingValue, customConvertFromUserFacingToDatabaseFacingValue, customValidateUserFacingValue properties.', settingsBlob);
    }
    if (this.valueType_ === CUSTOM_VALUE_TYPE) {
      this.valueTypeStrategy_ = new ValueTypeStrategy(
        settingsBlob.customConvertFromUserToDatabaseFacingValue,
        settingsBlob.customConvertFromDatabaseToUserFacingValue,
        settingsBlob.customValidateUserFacingValue);
    } else {
      this.valueTypeStrategy_ = strategyForValueType[this.valueType_];
    }
    if (typeof this.allowedDatabaseFacingValues_ === typeof '' && this.allowedDatabaseFacingValues_.indexOf('Range(') === 0) {
      try {
        this.allowedDatabaseFacingValues_ = eval('new ' + this.allowedDatabaseFacingValues_);
      } catch (err) { }
      if (!this.allowedDatabaseFacingValues_) {
        throwError('Tried to parse allowedValues as a Range, but failed.', settingsBlob.allowedDatabaseFacingValues);
      }
      if (this.valueType_ === STRING_VALUE_TYPE) {
        throwError('The allowed values are a range for that setting, but the value type is STRING. If the allowed values are a range, the value type must be INTEGER or FLOAT', settingsBlob);
      }
      if (this.valueType_ === BOOLEAN_VALUE_TYPE) {
        throwError('The allowed values are a range for that setting, but the value type is BOOLEAN. If the allowed values are a range, the value type must be INTEGER or FLOAT', settingsBlob);
      }
    }
  }

  getChildForRelativeQualifiedName(relativeQualifiedName) {
    return this;
  }

  getCurrentDatabaseFacingValue(settings, channelId) {
    let settingsForChannel = settings.channelSettings[channelId];
    if (settingsForChannel) {
      let setting = settings.channelSettings[channelId][this.fullyQualifiedName_];
      if (setting !== undefined) {
        return setting;
      }
    }
    let serverSetting = settings.serverSettings[this.fullyQualifiedName_];
    if (serverSetting !== undefined) {
      return serverSetting;
    }
    return this.defaultDatabaseFacingValue_;
  }

  getCurrentUserFacingValue(bot, msg, settings) {
    return this.convertDatabaseFacingValueToUserFacingValue_(bot, msg, this.getCurrentDatabaseFacingValue(settings, msg.channel.id));
  }

  getDefaultUserFacingValue(bot, msg) {
    return this.convertDatabaseFacingValueToUserFacingValue_(bot, msg, this.defaultDatabaseFacingValue_);
  }

  getUserFacingExampleValues(bot, msg) {
    if (this.customUserFacingExampleValues_) {
      return this.customUserFacingExampleValues_;
    } else {
      return [this.convertDatabaseFacingValueToUserFacingValue_(bot, msg, this.defaultDatabaseFacingValue_)];
    }
  }

  getFullyQualifiedName() {
    return this.fullyQualifiedName_;
  }

  getUnqualifiedName() {
    return this.name_;
  }

  getConfigurationInstructionsString(bot, msg, settings, desiredFullyQualifiedName) {
    let prefix = '';
    if (this.fullyQualifiedName_ !== desiredFullyQualifiedName) {
      prefix = 'I didn\'t find settings for ' + desiredFullyQualifiedName + '. Here are the settings for ' + this.fullyQualifiedName_ + '.\n\n';
    }

    let examplesString = this.getUserFacingExampleValues(bot, msg).map(exampleValue => {
      return `${this.serverSettingsCommand_} ${this.fullyQualifiedName_} ${exampleValue}`;
    }).join('\n');

    return {
      embed: {
        title: this.fullyQualifiedName_,
        description: this.description_,
        color: this.colorForEmbeds_,
        fields: [
          {name: 'Value type', value: this.getValueTypeDescription_()},
          {name: 'Allowed values', value: this.getAllowedValueString_()},
          {name: 'Current value in this channel', value: this.getCurrentUserFacingValue(bot, msg, settings)},
          {name: 'Examples of setting value', value: examplesString}
        ]
      }
    }
  }

  getRequestInputMessageString() {
    return `What channels should the new setting apply to? You can say **all**, or **here**, or specify a list of channels, for example: **#welcome #general #bot**. You can also say 'cancel'.`;
  }

  setNewValueFromUserFacingString(bot, msg, currentSettings, newValue, channelsString) {
    if (!channelsString) {
      channelsString = 'all';
    }
    if (!this.valueTypeStrategy_.validateUserFacingValue(bot, msg, newValue)) {
      return this.createValidationFailureString_();
    }
    let databaseFacingValue = this.convertUserFacingValueToDatabaseFacingValue_(bot, msg, newValue);
    channelsString = channelsString.toLowerCase();

    if (channelsString === 'cancel') {
      return 'The settings were not changed.';
    }
    if (channelsString === 'all') {
      currentSettings.serverSettings[this.fullyQualifiedName_] = databaseFacingValue;
      clearValueFromChannelSettings(currentSettings.channelSettings, this.fullyQualifiedName_);
    } else if (channelsString === 'here') {
      if (!currentSettings.channelSettings[msg.channel.id]) {
        currentSettings.channelSettings[msg.channel.id] = {};
      }
      currentSettings.channelSettings[msg.channel.id][this.fullyQualifiedName_] = databaseFacingValue;
    } else {
      let channelIds = extractChannelIdsFromString(channelsString);
      let channelsNotInGuild = findChannelsNotInGuild(channelIds, msg.channel.guild);
      if (channelsNotInGuild.length > 0) {
        return `The setting wasn't applied. I couldn't find channels: ${channelsNotInGuild.join(', ')} in this server.`;
      }
      for (let channelId of channelIds) {
        if (!currentSettings.channelSettings[channelId]) {
          currentSettings.channelSettings[channelId] = {};
        }
        currentSettings.channelSettings[channelId][this.fullyQualifiedName_] = databaseFacingValue;
      }
    }
    let configurationInstructions = this.getConfigurationInstructionsString(bot, msg, currentSettings);
    configurationInstructions.content = 'Setting updated! Here is the updated setting.';
    return configurationInstructions;
  }

  convertUserFacingValueToDatabaseFacingValue_(bot, msg, value) {
    return this.valueTypeStrategy_.convertUserFacingValueToDatabaseFacingValue(bot, msg, value);
  }

  validateNewDatabaseFacingValue_(bot, msg, value) {
    if (this.customValidateDatabaseFacingValueFunction_) {
      let result = this.customValidateDatabaseFacingValueFunction_(bot, msg, value);
      if (result) {
        return result;
      }
    }
    if (this.allowedDatabaseFacingValues_ && Array.isArray(this.allowedDatabaseFacingValues_) && this.validateDatabaseFacingValueIsInArray_(value)) {
      return true;
    }
    if (this.allowedDatabaseFacingValues_ instanceof Range && this.validateDatabaseFacingValueIsWithinRange_(value)) {
      return true;
    }
    if (this.valueType_ === BOOLEAN_VALUE_TYPE && this.validateDatabaseFacingValueIsBoolean_(value)) {
      return true;
    }
    return false;
  }

  validateDatabaseFacingValueIsBoolean_(value) {
    return typeof value === typeof true;
  }

  validateDatabaseFacingValueIsWithinRange_(value) {
    return this.allowedDatabaseFacingValues_.isWithinRange(value);
  }

  validateDatabaseFacingValueIsInArray_(value) {
    return this.allowedDatabaseFacingValues_.indexOf(value) !== -1;
  }

  convertDatabaseFacingValueToUserFacingValue_(bot, msg, value) {
    return this.valueTypeStrategy_.convertDatabaseFacingValueToUserFacingValue(bot, msg, value);
  }

  getValueTypeDescription_() {
    return this.customValueTypeDescription_ || prettyPrintForValueType[this.valueType_];
  }

  getAllowedValueString_() {
    if (this.customAllowedValuesString_) {
      return this.customAllowedValuesString_;
    }
    let prettyPrintedValueType = prettyPrintForValueType[this.valueType_];
    if (!this.allowedDatabaseFacingValues_) {
      return arbitraryAllowedValuesForType[this.valueType_];
    }
    if (this.allowedDatabaseFacingValues_ instanceof Range) {
      return prettyPrintedValueType + ' between ${this.allowedDatabaseFacingValues_.getLower()} and ${this.allowedDatabaseFacingValues_.getUpper()}';
    }
    if (Array.isArray(this.allowedDatabaseFacingValues_)) {
      return 'One of: ' + this.allowedDatabaseFacingValues_.join(', ');
    }
  }

  createValidationFailureString_() {
    return 'Could not apply that setting, because it is invalid. It must be: ' + this.getAllowedValueString_().toLowerCase();
  }
}

module.exports = Setting;
