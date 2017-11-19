const assert = require('assert');
const Command = require('./../core/command.js');
const MockMessage = require('./mock_objects/mock_message.js');
const MockConfig = require('./mock_objects/mock_config.js');
const persistence = require('./../core/persistence.js');
const Storage = require('node-persist');
const MockLogger = require('./mock_objects/mock_logger.js');
const SettingsManager = require('./../core/settings_manager.js');
const strings = require('./../core/string_factory.js').command;

const MsgNoPerms = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], []);
const MsgIsServerAdminWithTag = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], ['Server Admin']);
const MsgIsServerAdmin = new MockMessage('channel1', 'user1', 'Username', [], [], 'content', ['manageGuild']);
const MsgIsBotAdmin = new MockMessage('channel1', 'bot-admin-id', 'Username');
const MsgIsBotAndServerAdmin = new MockMessage('channel1', 'bot-admin-id', 'Username', ['Server Admin'], ['Server Admin']);
const MsgDM = new MockMessage('channel1', 'not-bot-admin', 'Username');
const config = new MockConfig('Server Admin', ['bot-admin-id']);

const ENABLED_COMMANDS_CATEGORY_NAME = 'enabled_commands';

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

let commandEnabledSettingsGetter = createSettingsGetter(true);
let commandDisabledSettingsGetter = createSettingsGetter(false);

if (!persistence.initialized_) {
  persistence.init({dir: './test/persistence'});
}

Storage.clearSync();

const commandDataNoAliases = {
  commandAliases: [],
  canBeChannelRestricted: false,
  action(bot, msg, suffix) { },
};

const commandDataUndefinedAliases = {
  canBeChannelRestricted: false,
  action(bot, msg, suffix) { },
};

const commandDataBlankAlias = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', ''],
  action(bot, msg, suffix) { },
};

const commandDataNonStringAliases = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 5],
  action(bot, msg, suffix) { },
};

const commandDataNonNumberCooldown = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  cooldown: 'string',
  action(bot, msg, suffix) { },
};

const commandDataNegativeCooldown = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  cooldown: -5,
  action(bot, msg, suffix) { },
};

const commandDataNoAction = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
};

const commandDataInvalidAction = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  action: 'invalid',
};

const commandDataMissingUniqueId = {
  commandAliases: ['alias1', 'alias2'],
  canBeChannelRestricted: true,
  action(bot, msg, suffix) { },
};

const commandDataNonStringUniqueId = {
  commandAliases: ['alias1', 'alias2'],
  canBeChannelRestricted: true,
  uniqueId: 5,
  action(bot, msg, suffix) { },
};

const commandDataInvalidServerAdminOnly = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  serverAdminOnly: 'invalid',
  action(bot, msg, suffix) { },
};

const commandDataInvalidBotAdminOnly = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  botAdminOnly: 'invalid',
  action(bot, msg, suffix) { },
};

const commandDataInvalidCanBeChannelRestricted = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  canBeChannelRestricted: 'invalid',
  action(bot, msg, suffix) { },
};

const commandDataInvalidOnlyInServer = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  onlyInServer: 'invalid',
  action(bot, msg, suffix) { },
};

const commandDataInvalidCanHandleExtension = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  canHandleExtension: 5,
  action(bot, msg, suffix) { },
};

const validCommandDataWithCooldown = {
  canBeChannelRestricted: true,
  uniqueId: 'coolcool',
  commandAliases: ['alias1', 'alias2'],
  cooldown: .2,
  action(bot, msg, suffix) { this.invoked = true; },
};

const validCommandDataBotAdminOnly = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  botAdminOnly: true,
  action(bot, msg, suffix) { this.invoked = true; },
};

const validCommandDataServerAdminOnly = {
  canBeChannelRestricted: false,
  commandAliases: ['alias1', 'alias2'],
  serverAdminOnly: true,
  action(bot, msg, suffix) { this.invoked = true; },
};

const validCommandServerOnly = {
  canBeChannelRestricted: true,
  uniqueId: 'serverOnlyffff',
  commandAliases: ['alias1', 'alias2'],
  onlyInServer: true,
  action(bot, msg, suffix) {
    assert(this.getEnabledSettingFullyQualifiedUserFacingName() === ENABLED_COMMANDS_CATEGORY_NAME + config.settingsCategorySeparator + 'alias1');
    this.invoked = true;
  },
};

const validCommandCanBeRestricted = {
  commandAliases: ['alias1', 'alias2'],
  canBeChannelRestricted: true,
  uniqueId: 'uniqueid',
  action(bot, msg, suffix) { this.invoked = true; },
};

const validCommandStringAlias = {
  commandAliases: 'alias1',
  canBeChannelRestricted: true,
  uniqueId: 'uniqueid',
  action(bot, msg, suffix) { this.invoked = true; },
};

const invalidRequiredSettings1 = {
  commandAliases: 'alias1',
  canBeChannelRestricted: false,
  requiredSettings: 534545,
  action(bot, msg, suffix) { this.invoked = true; },
};

const invalidRequiredSettings2 = {
  commandAliases: 'alias1',
  canBeChannelRestricted: false,
  requiredSettings: [534545],
  action(bot, msg, suffix) { this.invoked = true; },
};

const invalidAliasContainsSeparatorCharacter = {
  commandAliases: 'al/ias1',
  canBeChannelRestricted: false,
  action(bot, msg, suffix) { this.invoked = true; },
};

const validRequiredSettings1 = {
  commandAliases: 'alias1',
  canBeChannelRestricted: false,
  requiredSettings: 'requiredSetting',
  action(bot, msg, suffix) { this.invoked = true; },
};

const validRequiredSettings2 = {
  commandAliases: 'alias1',
  canBeChannelRestricted: false,
  requiredSettings: ['requiredSetting'],
  action(bot, msg, suffix) { this.invoked = true; },
};

const validCommandUndefinedCanBeChannelRestrictedUserCommand = {
  commandAliases: 'alias1',
  uniqueId: 'uniqueid',
  action(bot, msg, suffix) { this.invoked = true; },
};

const validCommandUndefinedCanBeChannelRestrictedAdminCommand = {
  commandAliases: 'alias1',
  botAdminOnly: true,
  action(bot, msg, suffix) { this.invoked = true; },
};

const validCommandDatas = [
  {
    commandAliases: ['alias1', 'alias2'],
    canBeChannelRestricted: false,
    action(bot, msg, suffix) { },
  },
  {
    commandAliases: ['alias1', 'alias2'],
    canBeChannelRestricted: true,
    uniqueId: 'fffff',
    action(bot, msg, suffix) { },
  },
  {
    commandAliases: ['alias1', 'alias2'],
    canBeChannelRestricted: false,
    serverAdminOnly: true,
    action(bot, msg, suffix) { },
  },
  {
    commandAliases: ['alias1', 'alias2'],
    canBeChannelRestricted: false,
    botAdminOnly: true,
    action(bot, msg, suffix) { },
  },
  {
    commandAliases: ['alias1', 'alias2'],
    canBeChannelRestricted: false,
    onlyInServer: true,
    action(bot, msg, suffix) { },
  },
  {
    commandAliases: ['alias1', 'alias2'],
    canBeChannelRestricted: false,
    cooldown: 5,
    action(bot, msg, suffix) { },
  },
];

function errorStringMatches(error, errorString) {
  if (error.logDescription) {
    return error.logDescription === errorString && !!errorString;
  }
  return error.message === errorString && !!errorString;
}

const settingsCategorySeparator = (new MockConfig()).settingsCategorySeparator;

describe('Command', function() {
  describe('constructor()', function() {
    it('should throw if there\'s no settingsCategorySeparator', function() {
      assert.throws(
        () => new Command(validCommandStringAlias, undefined, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.noSettingsCategorySeparator));
    });
    it('should throw if there\'s no settings category name', function() {
      assert.throws(
        () => new Command(validCommandStringAlias, settingsCategorySeparator),
        err => errorStringMatches(err, strings.validation.noEnabledCommandsCategoryName));
    });
    it('should throw if there is no data', function() {
      assert.throws(
        () => new Command(undefined, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.noData));;
    });
    it('should throw if you don\'t provide any command aliases', function() {
      assert.throws(
        () => new Command(commandDataNoAliases, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.noAliases));
      assert.throws(
        () => new Command(commandDataUndefinedAliases, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.noAliases));
    });
    it('should throw if you provide an invalid alias', function() {
      assert.throws(
        () => new Command(commandDataBlankAlias, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidAlias));
      assert.throws(
        () => new Command(commandDataNonStringAliases, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidAlias));
    });
    it('should throw if you provide an invalid cooldown', function() {
      assert.throws(
        () => new Command(commandDataNonNumberCooldown, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidCooldown));
      assert.throws(
        () => new Command(commandDataNegativeCooldown, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.negativeCooldown));
    });
    it('should throw if provided an invalid action', function() {
      assert.throws(
        () => new Command(commandDataNoAction, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.noAction));
      assert.throws(
        () => new Command(commandDataInvalidAction, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.noAction));
    });
    it('should throw if canBeChannelRestricted is true but no/invalid uniqueId is provided', function() {
      assert.throws(
        () => new Command(commandDataMissingUniqueId, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.needsUniqueId));
      assert.throws(
        () => new Command(commandDataNonStringUniqueId, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.needsUniqueId));
    });
    it('should throw if serverAdminOnly is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidServerAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidServerAdminOnly));
    });
    it('should throw if botAdminOnly is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidBotAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidBotAdminOnly));
    });
    it('should throw if canBeChannelRestricted is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidCanBeChannelRestricted, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidCanBeChannelRestricted));
    });
    it('should throw if onlyInServer is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidOnlyInServer, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidOnlyInServer));
    });
    it('should not throw on valid command data', function() {
      for (let validCommandData of validCommandDatas) {
        new Command(validCommandData, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      }
    });
    it('should convert one string to an array', function() {
      let alias = validCommandStringAlias.commandAliases;
      let command = new Command(validCommandStringAlias, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      assert.deepEqual(command.aliases, [alias]);
    });
    it('should accept valid requiredSettings values', function() {
      let command = new Command(validRequiredSettings1, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      command = new Command(validRequiredSettings2, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
    });
    it('should throw on invalid requiredSettings values', function() {
      assert.throws(
        () => new Command(invalidRequiredSettings1, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidRequiredSettings));
      assert.throws(
        () => new Command(invalidRequiredSettings2, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.nonStringSetting));
    });
    it('should throw if canHandleExtension is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidCanHandleExtension, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.invalidCanHandleExtension));
    });
    it('should throw if a command alias contains the command separator string', function() {
      assert.throws(
        () => new Command(invalidAliasContainsSeparatorCharacter, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME),
        err => errorStringMatches(err, strings.validation.createCannotContainCategorySeparatorString(settingsCategorySeparator)));
    });
    it('should correctly auto-set canBeChannelRestricted if it\'s undefined', function() {
      let command1 = new Command(validCommandUndefinedCanBeChannelRestrictedAdminCommand, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      let command2 = new Command(validCommandUndefinedCanBeChannelRestrictedUserCommand, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      assert(!command1.createEnabledSetting());
      assert(command2.createEnabledSetting());
    });
  });
  describe('handle()', function() {
    it('should not execute if not cooled down', function() {
      let command = new Command(validCommandDataWithCooldown, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      assert(command.getCooldown() === validCommandDataWithCooldown.cooldown);
      return command.handle(null, MsgNoPerms, '', '', config, commandEnabledSettingsGetter).then(result1 => {
        return assert.throws(
          () => command.handle(null, MsgNoPerms, '', '', config, commandEnabledSettingsGetter),
          err => {
            let logger = new MockLogger();
            err.output(logger, '', config, MsgNoPerms, false);
            return logger.failureMessage === strings.invokeFailure.notCooledDownLogDescription;
          });
      });
    });
    it('should execute if cooled down', function(done) {
      let command = new Command(validCommandDataWithCooldown, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      command.handle(null, MsgNoPerms, '', '', config, commandEnabledSettingsGetter).then(invoke1Result => {
        setTimeout(() => {
          command.handle(null, MsgNoPerms, '', '', config, commandEnabledSettingsGetter).then(invoke2Result => {
            if (invoke1Result === undefined && typeof invoke2Result !== typeof '') {
              done();
            } else {
              done('Failed to cool down');
            }
          }).catch(done);
        },
        300);
      }).catch(done);
    });
    it('should not execute if user must be a bot admin but is not', function() {
      let command = new Command(validCommandDataBotAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      assert.throws(
        () => command.handle(null, MsgNoPerms, '', '', config, commandEnabledSettingsGetter),
        err => {
          let logger = new MockLogger();
          err.output(logger, '', config, MsgNoPerms, false);
          return logger.failureMessage === strings.invokeFailure.onlyBotAdminLog;
        });
      assert.throws(
        () => command.handle(null, MsgIsServerAdminWithTag, '', '', config, commandEnabledSettingsGetter),
        err => {
          let logger = new MockLogger();
          err.output(logger, '', config, MsgNoPerms, false);
          return logger.failureMessage === strings.invokeFailure.onlyBotAdminLog;
        });
      assert(command.getIsForBotAdminOnly());
    });
    it('should execute if user must be a bot admin and is', function() {
      let command = new Command(validCommandDataBotAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      return command.handle(null, MsgIsBotAdmin, '', '', config, commandEnabledSettingsGetter).then(invoke1Result => {
        assert(invoke1Result === undefined && command.invoked);
      });
    });
    it('should not execute if must be in server but is not', function() {
      let command = new Command(validCommandServerOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      assert.throws(
        () => command.handle(null, MsgDM, '', '', config, commandEnabledSettingsGetter),
        err => {
          let logger = new MockLogger();
          err.output(logger, '', config, MsgNoPerms, false);
          return logger.failureMessage === strings.invokeFailure.onlyInServerLog;
        });
    });
    it('should execute if must be in server and is', function() {
      let command = new Command(validCommandServerOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      return command.handle(null, MsgNoPerms, '', '', config, commandEnabledSettingsGetter).then(() => {
        assert(command.invoked);
      });
    });
    it('should not execute if user must be a server admin but is not', function() {
      let command = new Command(validCommandDataServerAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      assert.throws(
        () => command.handle(null, MsgNoPerms, '', '', config, commandEnabledSettingsGetter),
        err => {
          let logger = new MockLogger();
          err.output(logger, '', config, MsgNoPerms, false);
          return logger.failureMessage === strings.invokeFailure.mustBeServerAdminLog;
        });
    });
    it('should execute if user must be a server admin, is not, but its a DM', function() {
      let command = new Command(validCommandDataServerAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      return command.handle(null, MsgDM, '', '', config, commandEnabledSettingsGetter).then(() => {
        assert(command.invoked);
      });
    });
    it('should execute if user must be a server admin and is', function() {
      let command = new Command(validCommandDataServerAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      return command.handle(null, MsgIsBotAdmin, '', '', config, commandEnabledSettingsGetter).then(invokeResult => {
        assert(command.getIsForServerAdminOnly());
        assert(invokeResult === undefined && command.invoked);
        command = new Command(validCommandDataServerAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
        return command.handle(null, MsgIsServerAdminWithTag, '', '', config, commandEnabledSettingsGetter).then(invokeResult => {
          assert(invokeResult === undefined && command.invoked);
          command = new Command(validCommandDataServerAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
          return command.handle(null, MsgIsServerAdmin, '', '', config, commandEnabledSettingsGetter).then(invokeResult => {
            assert(invokeResult === undefined && command.invoked);
            command = new Command(validCommandDataServerAdminOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
            return command.handle(null, MsgIsBotAndServerAdmin, '', '', config, commandEnabledSettingsGetter).then(invokeResult => {
              assert(invokeResult === undefined && command.invoked);
            });
          });
        });
      });
    });
    it('should throw if disabled', function() {
      let command = new Command(validCommandDataWithCooldown, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      return command.handle(null, MsgNoPerms, '', '', config, commandDisabledSettingsGetter).then(() => {
        throw new Error('Should have thrown but didnt');
      }).catch(err => {
        let logger = new MockLogger();
        err.output(logger, '', config, MsgNoPerms, false);
        if (logger.failureMessage === strings.invokeFailure.commandDisabledLog) {
          return;
        }
        throw err;
      });
    });
  });
  describe('createEnabledSetting()', function() {
    it('should return a valid setting that the SettingsManager can load', function() {
      let logger = new MockLogger();
      let command = new Command(validCommandServerOnly, settingsCategorySeparator, ENABLED_COMMANDS_CATEGORY_NAME);
      let setting = command.createEnabledSetting();
      let settingsManager = new SettingsManager(logger, config);
      assert(logger.failed !== true);
    });
  });
});

