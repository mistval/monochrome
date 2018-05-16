const { SettingsConverters } = require('./../monochrome.js');
const assert = require('assert');

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
});
