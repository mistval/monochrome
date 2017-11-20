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

let valid1 = {
  "type": "CATEGORY",
  "userFacingName": 'name',
  "children": [],
};

let validHierarchy1 = {
  "type": "CATEGORY",
  "userFacingName": 'root',
  "children": [
    {
      "type": "CATEGORY",
      "userFacingName": 'subcategory1',
      "children": [
        {
          "type": "SETTING",
          "userFacingName": "setting1",
          "description": "This setting controls what number I'll count down from when you use the bot!countdown command.",
          "valueType": "INTEGER",
          "defaultDatabaseFacingValue": 10,
          "allowedDatabaseFacingValues": "Range(1, 10)"
        }
      ],
    },
    {
      "type": "CATEGORY",
      "userFacingName": 'subcategory2',
      "children": [
        {
          "type": "SETTING",
          "userFacingName": "setting2",
          "description": "This setting controls what number I'll count down from when you use the bot!countdown command.",
          "valueType": "INTEGER",
          "defaultDatabaseFacingValue": 10,
          "allowedDatabaseFacingValues": "Range(1, 10)"
        },
        {
          "type": "SETTING",
          "userFacingName": "setting3",
          "description": "This setting controls what number I'll count down from when you use the bot!countdown command.",
          "valueType": "INTEGER",
          "defaultDatabaseFacingValue": 10,
          "allowedDatabaseFacingValues": "Range(1, 10)"
        },
      ],
    },
  ],
};

const MOCK_PARENT_FULLY_QUALIFIED_NAME1 = 'parentname1';
const CATEGORY_TYPE_IDENTIFIER = 'CATEGORY';
const SETTING_TYPE_IDENTIFIER = 'SETTING';

function createRootSettingsCategory(settingsBlob) {
  return SettingsCategory.createRootCategory(CATEGORY_TYPE_IDENTIFIER, SETTING_TYPE_IDENTIFIER, [settingsBlob], config);
}

function createNonRootSettingsCategory(settingsBlob) {
  return new SettingsCategory(settingsBlob, MOCK_PARENT_FULLY_QUALIFIED_NAME1, CATEGORY_TYPE_IDENTIFIER, SETTING_TYPE_IDENTIFIER, config);
}

function createNonRootSettingsCategoryWithInvalidCategoryIdentifier(settingsBlob) {
  return new SettingsCategory(settingsBlob, MOCK_PARENT_FULLY_QUALIFIED_NAME1, 5, SETTING_TYPE_IDENTIFIER, config);
}

function createNonRootSettingsCategoryWithInvalidSettingIdentifier(settingsBlob) {
  return new SettingsCategory(settingsBlob, MOCK_PARENT_FULLY_QUALIFIED_NAME1, CATEGORY_TYPE_IDENTIFIER, 5, config);
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
    it('Throws for invalid category identifier', function() {
      assert.throws(
        () => createNonRootSettingsCategoryWithInvalidCategoryIdentifier(valid1),
        err => err.message === strings.createInvalidCategoryIdentifierErrorString(valid1));
    });
    it('Throws for invalid setting identifier', function() {
      assert.throws(
        () => createNonRootSettingsCategoryWithInvalidSettingIdentifier(valid1),
        err => err.message === strings.createInvalidSettingIdentifierErrorString(valid1));
    });
    it('Valid settings blobs load without error', function() {
      createNonRootSettingsCategory(valid1);
      createNonRootSettingsCategory(validHierarchy1);
    });
  });
  describe('Child resolution', function() {
    it('Resolves to the correct children', function() {
      let settingCategory = createRootSettingsCategory(validHierarchy1);
      let qualifiedNamesToTest = [
        'root.subcategory1',
        'root.subcategory1.setting1',
        'root.subcategory2',
        'root.subcategory2.setting2',
        'root.subcategory2.setting3',
      ];

      for (let name of qualifiedNamesToTest) {
        let child = settingCategory.getChildForFullyQualifiedUserFacingName(name);
        assert(child.getFullyQualifiedUserFacingName() === name);
      }
    });
    it('Fuzzy resolves to the nearest match child, if a match doesn\'t exist', function() {
      let settingCategory = createRootSettingsCategory(validHierarchy1);
      let tests = [
        {query: 'root.subcategory1ff', result: 'root'},
        {query: 'rooeft.subcategory1', result: ''},
        {query: 'root.', result: 'root'},
        {query: 'root.subcategory2.', result: 'root.subcategory2'},
        {query: 'root.subcategory2.fff', result: 'root.subcategory2'},
        {query: 'root.subcategory2.setting3.', result: 'root.subcategory2'},
        {query: 'root.subcategory2.setting3.fff', result: 'root.subcategory2'},
      ];

      for (let test of tests) {
        let child = settingCategory.getChildForFullyQualifiedUserFacingName(test.query);
        if (child.getFullyQualifiedUserFacingName() !== test.result) {
        }
        assert(child.getFullyQualifiedUserFacingName() === test.result);
      }
    });
  });
  describe('Polymorphism', function() {
    it('Throws if you try to set a value on it as if it is a setting', function() {
      let settingCategory = createRootSettingsCategory(validHierarchy1);
      assert.throws(
        () => settingCategory.setNewValueFromUserFacingString(''),
        err => err.message === strings.setValueError);
    });
  });
});