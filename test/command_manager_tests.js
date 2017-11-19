const CommandManager = require('./../core/command_manager.js');
const MockLogger = require('./mock_objects/mock_logger.js');
const MockMessage = require('./mock_objects/mock_message.js');
const assert = require('assert');
const MockConfig = require('./mock_objects/mock_config.js');
const strings = require('./../core/string_factory.js').commandManager;

const config = new MockConfig('Server Admin', ['bot-admin-id']);
const MsgAboutCommand = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], 'bot!about suffix');
const MsgHelpCommand = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], 'bot!help');

function createSettingsGetter(commandEnabled, otherSettings) {
  return {
    getSettings: (bot, msg, fullyQualifiedUserFacingSettingNames) => {
      let settings = {};
      for (let fullyQualifiedUserFacingSettingName of fullyQualifiedUserFacingSettingNames) {
        settings[fullyQualifiedUserFacingSettingName] = commandEnabled;
      }
      otherSettings = otherSettings || {};
      for (let otherSetting of Object.keys(otherSettings)) {
        settings[otherSetting] = otherSettings[otherSetting];
      }
      return Promise.resolve(settings);
    }
  };
}

let enabledSettingsGetter = createSettingsGetter(true);

describe('CommandManager', function() {
  describe('Load', function() {
    it('Refuses to load the command and complains in the logger if there is a bad command', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, logger, config, enabledSettingsGetter);
      return commandManager.load(__dirname + '/mock_commands/invalid_and_valid', []).then(() => {
        assert(logger.failed === true);
        let invokeResult = commandManager.processInput(null, MsgHelpCommand, config);
        assert(invokeResult === false);
      });
    });
    it('Loads good commands even if it encounters a bad one', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, logger, config, enabledSettingsGetter);
      return commandManager.load(__dirname + '/mock_commands/invalid_and_valid', []).then(() => {
        let invokeResult = commandManager.processInput(null, MsgAboutCommand, config);
        assert(invokeResult === true);
      });
    });
    it('Refuses to load command and complains if two commands have save uniqueId', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, logger, config, enabledSettingsGetter);
      return commandManager.load(__dirname + '/mock_commands/duplicate_unique_ids', []).then(() => {
        assert(logger.failureMessage === strings.validation.createNonUniqueUniqueIdMessage('not unique'));
        let invokeResult1 = commandManager.processInput(null, MsgAboutCommand, config);
        let invokeResult2 = commandManager.processInput(null, MsgHelpCommand, config);
        assert(logger.failed === true);
        assert((invokeResult1 === true && invokeResult2 === false) || (invokeResult1 === false && invokeResult2 === true));
      });
    });
    it('Refuses to load command and complains if two commands have the same alias', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, logger, config, enabledSettingsGetter);
      return commandManager.load(__dirname + '/mock_commands/duplicate_aliases', []).then(() => {
        assert(logger.failureMessage === strings.validation.createNonUniqueAliasMessage(undefined, 'duplicate'));
        let invokeResult1 = commandManager.processInput(null, MsgAboutCommand, config);
        let invokeResult2 = commandManager.processInput(null, MsgHelpCommand, config);
        assert(logger.failed === true);
        assert((invokeResult1 === true && invokeResult2 === false) || (invokeResult1 === false && invokeResult2 === true));
      });
    });
    it('Errors trying to load commands from nonexistent directory', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, logger, config, enabledSettingsGetter);
      return commandManager.load(__dirname + '/nonexistent_directory', []).then(() => {
        assert(logger.failureMessage === strings.validation.genericError);
        assert(logger.failed === true);
      });
    });
    it('Gracefully handles command that throws', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, logger, config, enabledSettingsGetter);
      return commandManager.load(__dirname + '/mock_commands/valid_throws', []).then(() => {
        commandManager.processInput(null, MsgAboutCommand, config);
        setTimeout(
          () => {
            assert(logger.failureMessage === strings.commandExecutionFailure.createErrorDescription(MsgAboutCommand.content));
            assert(logger.failed === true);
          }, 100);
      });
    });
    it('Converts string return values into failures and logs them', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, logger, config, enabledSettingsGetter);
      return commandManager.load(__dirname + '/mock_commands/valid_returns_string', []).then(() => {
        commandManager.processInput(null, MsgAboutCommand, config);
        setTimeout(
          () => {
            assert(logger.failureMessage === 'Fail');
            assert(logger.failed === true);
          }, 100);
      });
    });
  });
});

