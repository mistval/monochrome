const { SettingsValidators } = require('./../monochrome.js');
const assert = require('assert');

describe('Settings validators', function() {
  describe('Range validator', function() {
    it('Accepts in-range values', function() {
      const validator = SettingsValidators.createRangeValidator(-5, 10);
      assert(validator(-5));
      assert(validator(10));
      assert(validator(1));
      assert(validator(-3));
    });
    it('Rejects out-of-range values', function() {
      const validator = SettingsValidators.createRangeValidator(-5, 10);
      assert(!validator(-5.5));
      assert(!validator(20));
    });
    it('Verifies max >= min', function() {
      assert.throws(() => SettingsValidators.createRangeValidator(-5, -10));
    });
  });
  describe('Boolean validator', function() {
    it('Accepts boolean values', function() {
      assert(SettingsValidators.isBoolean(true));
      assert(SettingsValidators.isBoolean(false));
    });
    it('Rejects non-boolean values', function() {
      assert(!SettingsValidators.isBoolean(0));
      assert(!SettingsValidators.isBoolean(''));
      assert(!SettingsValidators.isBoolean([]));
      assert(!SettingsValidators.isBoolean(8));
    });
  });
  describe('Discrete option validator', function() {
    it('Verifies options are supplied', function() {
      assert.throws(() => SettingsValidators.createDiscreteOptionValidator());
      assert.throws(() => SettingsValidators.createDiscreteOptionValidator([]));
    });
    it('Accepts values that are in the given options', function() {
      const validator = SettingsValidators.createDiscreteOptionValidator(['test5', 'test6', 8, false]);
      assert(validator('test5'));
      assert(validator('test6'));
      assert(validator(8));
      assert(validator(false));
    });
    it('Rejects values that are not in the given options', function() {
      const validator = SettingsValidators.createDiscreteOptionValidator(['test5', 'test6', 8, false]);
      assert(!validator('test7'));
      assert(!validator(7));
      assert(!validator('7'));
      assert(!validator(true));
    });
  });
  describe('Map validator', function() {
    it('Returns true for non-undefined', function() {
      assert(SettingsValidators.isMappable(1));
      assert(SettingsValidators.isMappable('h'));
    });
    it('Returns false for undefined', function() {
      assert(!SettingsValidators.isMappable(undefined));
    });
  });
});
