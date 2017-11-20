const assert = require('assert');
const SettingsCategory = require('./../core/settings_category.js');
const strings = require('./../core/string_factory.js').settingsCategory;
const MockConfig = require('./mock_objects/mock_config.js');

const config = new MockConfig('Server Admin', ['bot-admin-id']);

let invalidUserFacingNameCategory1 = {
  "type": "CATEGORY",
  "userFacingName": 5,
  "children": [],
};

let invalidUserFacingNameCategory2 = {
  "type": "CATEGORY",
  "children": [],
};

let invalidChildren1 = {
  "type": "CATEGORY",
  "userFacingName": 'name',
};

let invalidChildren2 = {
  "type": "CATEGORY",
  "userFacingName": 'name',
  "children": 5,
};

const MOCK_PARENT_FULLY_QUALIFIED_NAME1 = 'parentname1';
const CATEGORY_TYPE_IDENTIFIER = 'CATEGORY';
const SETTING_TYPE_IDENTIFIER = 'SETTING';

function createNonRootSettingsCategory(settingsBlob) {
  return new SettingsCategory(settingsBlob, MOCK_PARENT_FULLY_QUALIFIED_NAME1, CATEGORY_TYPE_IDENTIFIER, SETTING_TYPE_IDENTIFIER, config);
}

describe('SettingsCategory', function() {
  describe('constructor()', function() {
    it('Throws if userFacingName is invalid', function() {
      assert.throws(
        () => createNonRootSettingsCategory(invalidUserFacingNameCategory1),
        err => err.message === strings.createInvalidUserFacingNameErrorString(invalidUserFacingNameCategory1));
      assert.throws(
        () => createNonRootSettingsCategory(invalidUserFacingNameCategory2),
        err => err.message === strings.createInvalidUserFacingNameErrorString(invalidUserFacingNameCategory2));
    });
    it('Throws if children are invalid', function() {
      assert.throws(
        () => createNonRootSettingsCategory(invalidChildren1),
        err => err.message === strings.createInvalidChildrenErrorString(invalidChildren1));
      assert.throws(
        () => createNonRootSettingsCategory(invalidChildren2),
        err => err.message === strings.createInvalidChildrenErrorString(invalidChildren2));
    });
  });
});