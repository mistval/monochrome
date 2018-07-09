const { SettingsConverters } = require('./../monochrome.js');
const assert = require('assert');

const map = {
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
};

describe('Settings converters', function() {
  it('Converts strings to floats', function() {
    assert(SettingsConverters.stringToFloat('1.5') === 1.5);
  });
  it('Converts values to strings', function() {
    assert(SettingsConverters.toString(1.5) === '1.5');
    assert(SettingsConverters.toString('test') === 'test');
    assert(SettingsConverters.toString(false) === 'false');
  });
  it('Converts strings to ints', function() {
    assert(SettingsConverters.stringToInt('5') === 5);
    assert(SettingsConverters.stringToInt('8.4') === 8);
  });
  it('Converts expected values to booleans', function() {
    const converter = SettingsConverters.createStringToBooleanConverter('Enabled', 'Disabled');
    assert(converter('enabled') === true);
    assert(converter('disabled') === false);
    assert(converter('eNaBlEd') === true);
  });
  it('Fails to convert unexpected values to booleans. Returns 0.', function() {
    const converter = SettingsConverters.createStringToBooleanConverter('Enabled', 'Disabled');
    assert(converter('other') === 0);
  });
  it('Converts booleans to expected values', function() {
    const converter = SettingsConverters.createBooleanToStringConverter('Enabled', 'Disabled');
    assert(converter(true) === 'Enabled');
    assert(converter(false) === 'Disabled');
  });
  it('Converts to lowercase string', function() {
    assert(SettingsConverters.toStringLowercase('test') === 'test');
    assert(SettingsConverters.toStringLowercase('tESt') === 'test');
  });
  it('Maps values correctly', function() {
    const converter = SettingsConverters.createMapConverter(map);
    const key1 = Object.keys(map)[0];
    const key2 = Object.keys(map)[2];

    assert(converter(key1) === map[key1]);
    assert(converter(key2) === map[key2]);
  });
  it('Inverse maps values correctly', function() {
    const converter = SettingsConverters.createInverseMapConverter(map);
    const value1 = Object.values(map)[1];
    const value2 = Object.values(map)[3];

    assert(map[converter(value1)] === value1);
    assert(map[converter(value2)] === value2);
  });
  it('Returns undefined for unmappable values', function() {
    const converter = SettingsConverters.createMapConverter(map);
    const key1 = 'xxx';
    assert(converter(key1) === undefined);
  });
  it('Returns undefined for unmappable values inverse', function() {
    const converter = SettingsConverters.createInverseMapConverter(map);
    const value1 = 'xxx';
    assert(map[converter(value1)] === undefined);
  });
});
