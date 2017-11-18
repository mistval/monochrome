const assert = require('assert');
const AbstractSettingsElement = require('./../core/abstract_setting_element.js');

class MockSettingsElementMissingFunction extends AbstractSettingsElement {
  constructor() {
    super();
  }

  getChildForFullyQualifiedUserFacingName() {}
  getFullyQualifiedUserFacingName() {}
  getConfigurationInstructionsBotContent() {}
}

describe('Abstract settings element', function() {
  describe('constructor()', function() {
    it('throws if child is missing a function', function() {
      assert.throws(() => new MockSettingsElementMissingFunction());
    });
  });
});