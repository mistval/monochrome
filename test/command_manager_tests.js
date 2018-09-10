const CommandManager = require('./../core/command_manager.js');
const MockLogger = require('./mock_objects/mock_logger.js');
const MockMessage = require('./mock_objects/mock_message.js');
const assert = require('assert');
const MockConfig = require('./mock_objects/mock_config.js');
const strings = require('./../core/string_factory.js').commandManager;
const publicErrorStrings = require('./../core/string_factory.js').publicError;
const helpStrings = require('./../core/string_factory.js').help;
const Settings = require('./../core/settings.js');
const Persistence = require('./../core/persistence.js');
const Storage = require('node-persist');

const config = new MockConfig('Server Admin', ['bot-admin-id']);
const persistence = new Persistence({dir: './test/persistence'}, config);
Storage.clearSync();

const MsgAboutCommand = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], 'bot!about suffix');
const MsgAboutCommandExtension = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], 'bot!aboutextension suffix');
const MsgHelpCommand = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], 'bot!help');
const MsgIsBotAdminReload = new MockMessage('channel1', 'bot-admin-id', 'Username', ['Server Admin'], [], '}reload');
const MsgIsServerAdminReload = new MockMessage('channel1', 'user1', 'Username', [], [], '}reload', ['manageGuild']);
const MsgNoPermsReload = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], [], '}reload');

function settings() {
  Storage.clearSync();
  return new Settings(persistence, new MockLogger());
}

function testReloadCommand(msg, callback) {
  let logger = new MockLogger();
  let reloaded = false;
  let reloadLamba = () => {
    reloaded = true;
  };
  let commandManager = new CommandManager(reloadLamba, null, logger, config, settings(), persistence);
  return commandManager.load(__dirname + '/mock_commands/settings_category_test_commands_no_settings').then(() => {
    commandManager.processInput(null, msg, config);
    setTimeout(
      () => {
        callback(reloaded);
      }, 100);
  });
}

describe.skip('CommandManager', function() {
  describe('Load', function() {
    it('Refuses to load the command and complains in the logger if there is a bad command', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, null, logger, config, settings(), persistence);
      return commandManager.load(__dirname + '/mock_commands/invalid_and_valid').then(() => {
        assert(logger.failed === true);
        let invokeResult = commandManager.processInput(null, MsgHelpCommand, config);
        assert(invokeResult === false);
      });
    });
    it('Loads good commands even if it encounters bad ones', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, null, logger, config, settings(), persistence);
      return commandManager.load(__dirname + '/mock_commands/invalid_and_valid').then(() => {
        let invokeResult = commandManager.processInput(null, MsgAboutCommand, config);
        assert(invokeResult);
      });
    });
    it('Refuses to load command and complains if two commands have the same uniqueId', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, null, logger, config, settings(), persistence);
      return commandManager.load(__dirname + '/mock_commands/duplicate_unique_ids').then(() => {
        assert(logger.failureMessage === strings.validation.createNonUniqueUniqueIdMessage('not_unique'));
        let invokeResult1 = commandManager.processInput(null, MsgAboutCommand, config);
        let invokeResult2 = commandManager.processInput(null, MsgHelpCommand, config);
        assert(logger.failed === true);
        assert((invokeResult1 && !invokeResult2) || (!invokeResult1 && invokeResult2));
      });
    });
    it('Refuses to load command and complains if two commands have the same alias', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, null, logger, config, settings(), persistence);
      return commandManager.load(__dirname + '/mock_commands/duplicate_aliases').then(() => {
        assert(logger.failureMessage === strings.validation.createNonUniqueAliasMessage(undefined, 'duplicate'));
        let invokeResult1 = commandManager.processInput(null, MsgAboutCommand, config);
        let invokeResult2 = commandManager.processInput(null, MsgHelpCommand, config);
        assert(logger.failed === true);
        assert((invokeResult1 && !invokeResult2) || (!invokeResult1 && invokeResult2));
      });
    });
    it('Errors trying to load commands from nonexistent directory', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, null, logger, config, settings(), persistence);
      return commandManager.load(__dirname + '/nonexistent_directory').then(() => {
        assert(logger.failureMessage === strings.validation.genericError);
        assert(logger.failed === true);
      });
    });
    it('Gracefully handles command that throws', function() {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, null, logger, config, settings(), persistence);
      return commandManager.load(__dirname + '/mock_commands/valid_throws').then(() => {
        commandManager.processInput(null, MsgAboutCommand, config);
        setTimeout(
          () => {
            assert(logger.failureMessage === publicErrorStrings.createErrorDescription(MsgAboutCommand.content));
            assert(logger.failed === true);
          }, 100);
      });
    });
    it('Converts string return values into failures and logs them', function(done) {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, null, logger, config, settings(), persistence);
      commandManager.load(__dirname + '/mock_commands/valid_returns_string').then(() => {
        commandManager.processInput(null, MsgAboutCommand, config);
        setTimeout(
          () => {
            if (logger.failureMessage === 'Fail' && logger.failed) {
              done();
            } else {
              done('fail');
            }
          }, 100);
      });
    });
    it('Invokes command with extension', function(done) {
      let logger = new MockLogger();
      let commandManager = new CommandManager(null, null, logger, config, settings(), persistence);
      commandManager.load(__dirname + '/mock_commands/valid_has_extension').then(() => {
        commandManager.processInput(null, MsgAboutCommandExtension, config);
        setTimeout(
          () => {
            let command = require('./mock_commands/valid_has_extension/has_extension.js');
            if (command.validateInvoked()) {
              done();
            } else {
              done('Validate invoked returned false');
            }
          }, 100);
      });
    });
    it('Creates the correct number of settings categories', function() {
      let logger = new MockLogger();
      let settingsObj = settings();
      let commandManager = new CommandManager(null, null, logger, config, settingsObj);
      return commandManager.load(__dirname + '/mock_commands/settings_category_test_commands_standard').then(() => {
        assert(settingsObj.getRawSettingsTree().length === 1);
        assert(settingsObj.getRawSettingsTree()[0].children.length === 6);
      });
    });
    it('Doesn\'t create enabled commands category if no commands are allowed to be restricted', function() {
      let logger = new MockLogger();
      let settingsObj = settings();
      let commandManager = new CommandManager(null, null, logger, config, settingsObj);
      return commandManager.load(__dirname + '/mock_commands/settings_category_test_commands_no_settings').then(() => {
        assert(settingsObj.getRawSettingsTree().length === 0);
      });
    });
    it('Reload command works for bot admin', function(done) {
      testReloadCommand(MsgIsBotAdminReload, reloaded => {
        if (reloaded) {
          return done();
        }
        done('Didn\'t reload');
      });
    });
    it('Reload command doesnt work for server admin', function(done) {
      testReloadCommand(MsgIsServerAdminReload, reloaded => {
        if (!reloaded) {
          return done();
        }
        done('Reloaded, but should not have');
      });
    });
    it('Reload command doesnt work for regular user', function(done) {
      testReloadCommand(MsgNoPermsReload, reloaded => {
        if (!reloaded) {
          return done();
        }
        done('Reloaded, but should not have');
      });
    });
    it('Creates and invokes help command', async function() {
      let logger = new MockLogger();
      let privateConfig = new MockConfig('Server Admin', ['bot-admin-id'], ['bot!help'], ['1']);
      let commandManager = new CommandManager(null, null, logger, privateConfig, settings(), persistence);
      await commandManager.load(__dirname + '/mock_commands/settings_category_test_commands_standard');
      let executedCommand = await commandManager.processInput(null, MsgHelpCommand, config);
      assert(executedCommand.aliases[0] === 'bot!help');
    });
    it('Does not create help command if no commands to show help for', async function() {
      let logger = new MockLogger();
      let privateConfig = new MockConfig('Server Admin', ['bot-admin-id'], ['bot!help'], []);
      let commandManager = new CommandManager(null, null, logger, privateConfig, settings(), persistence);
      await commandManager.load(__dirname + '/mock_commands/settings_category_test_commands_standard')
      let executedCommand = commandManager.processInput(null, MsgHelpCommand, config);
      assert(!executedCommand);
    });
    it('Does not create help command if no aliases for help', async function() {
      let logger = new MockLogger();
      let privateConfig = new MockConfig('Server Admin', ['bot-admin-id'], [], ['1']);
      let commandManager = new CommandManager(null, null, logger, privateConfig, settings(), persistence);
      await commandManager.load(__dirname + '/mock_commands/settings_category_test_commands_standard')
      let executedCommand = await commandManager.processInput(null, MsgHelpCommand, config);
      assert(!executedCommand);
    });
  });
});
