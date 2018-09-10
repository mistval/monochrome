const assert = require('assert');
const Command = require('./../core/command.js');
const MockMessage = require('./mock_objects/mock_message.js');
const MockConfig = require('./mock_objects/mock_config.js');
const Persistence = require('./../core/persistence.js');
const Storage = require('node-persist');
const MockLogger = require('./mock_objects/mock_logger.js');
const strings = require('./../core/string_factory.js').command;
const Settings = require('./../core/settings.js');

const MsgNoPerms = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], []);
const MsgIsServerAdminWithTag = new MockMessage('channel1', 'user1', 'Username', ['Server Admin'], ['Server Admin']);
const MsgIsServerAdmin = new MockMessage('channel1', 'user1', 'Username', [], [], 'content', ['manageGuild']);
const MsgIsBotAdmin = new MockMessage('channel1', 'bot-admin-id', 'Username');
const MsgIsBotAndServerAdmin = new MockMessage('channel1', 'bot-admin-id', 'Username', ['Server Admin'], ['Server Admin']);
const MsgDM = new MockMessage('channel1', 'not-bot-admin', 'Username');
const config = new MockConfig('Server Admin', ['bot-admin-id']);

const persistence = new Persistence({dir: './test/persistence'}, config);

Storage.clearSync();

async function disableCommand(settings, command, serverId) {
  let setting = command.createEnabledSetting();
  settings.addNodeToRoot(setting);

  await settings.setServerWideSettingValue(
    command.getEnabledSettingUniqueId(),
    serverId,
    'disabled',
    true,
  );
}

function newSettings() {
  Storage.clearSync();
  return new Settings(persistence, new MockLogger());
}

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

describe.skip('Command', function() {
  describe('constructor()', function() {
    it('should throw if there is no data', function() {
      assert.throws(
        () => new Command(undefined, newSettings()),
        err => errorStringMatches(err, strings.validation.noData));;
    });
    it('should throw if you don\'t provide any command aliases', function() {
      assert.throws(
        () => new Command(commandDataNoAliases, newSettings()),
        err => errorStringMatches(err, strings.validation.noAliases));
      assert.throws(
        () => new Command(commandDataUndefinedAliases, newSettings()),
        err => errorStringMatches(err, strings.validation.noAliases));
    });
    it('should throw if you provide an invalid alias', function() {
      assert.throws(
        () => new Command(commandDataBlankAlias, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidAlias));
      assert.throws(
        () => new Command(commandDataNonStringAliases, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidAlias));
    });
    it('should throw if you provide an invalid cooldown', function() {
      assert.throws(
        () => new Command(commandDataNonNumberCooldown, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidCooldown));
      assert.throws(
        () => new Command(commandDataNegativeCooldown, newSettings()),
        err => errorStringMatches(err, strings.validation.negativeCooldown));
    });
    it('should throw if provided an invalid action', function() {
      assert.throws(
        () => new Command(commandDataNoAction, newSettings()),
        err => errorStringMatches(err, strings.validation.noAction));
      assert.throws(
        () => new Command(commandDataInvalidAction, newSettings()),
        err => errorStringMatches(err, strings.validation.noAction));
    });
    it('should throw if canBeChannelRestricted is true but no/invalid uniqueId is provided', function() {
      assert.throws(
        () => new Command(commandDataMissingUniqueId, newSettings()),
        err => errorStringMatches(err, strings.validation.needsUniqueId));
      assert.throws(
        () => new Command(commandDataNonStringUniqueId, newSettings()),
        err => errorStringMatches(err, strings.validation.needsUniqueId));
    });
    it('should throw if serverAdminOnly is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidServerAdminOnly, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidServerAdminOnly));
    });
    it('should throw if botAdminOnly is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidBotAdminOnly, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidBotAdminOnly));
    });
    it('should throw if canBeChannelRestricted is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidCanBeChannelRestricted, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidCanBeChannelRestricted));
    });
    it('should throw if onlyInServer is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidOnlyInServer, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidOnlyInServer));
    });
    it('should not throw on valid command data', function() {
      for (let validCommandData of validCommandDatas) {
        new Command(validCommandData, newSettings());
      }
    });
    it('should convert one string to an array', function() {
      let alias = validCommandStringAlias.commandAliases;
      let command = new Command(validCommandStringAlias, newSettings());
      assert.deepEqual(command.aliases, [alias]);
    });
    it('should accept valid requiredSettings values', function() {
      let command = new Command(validRequiredSettings1, newSettings());
      command = new Command(validRequiredSettings2, newSettings());
    });
    it('should throw on invalid requiredSettings values', function() {
      assert.throws(
        () => new Command(invalidRequiredSettings1, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidRequiredSettings));
      assert.throws(
        () => new Command(invalidRequiredSettings2, newSettings()),
        err => errorStringMatches(err, strings.validation.nonStringSetting));
    });
    it('should throw if canHandleExtension is invalid', function() {
      assert.throws(
        () => new Command(commandDataInvalidCanHandleExtension, newSettings()),
        err => errorStringMatches(err, strings.validation.invalidCanHandleExtension));
    });
    it('should correctly auto-set canBeChannelRestricted if it\'s undefined', function() {
      let command1 = new Command(validCommandUndefinedCanBeChannelRestrictedAdminCommand, newSettings());
      let command2 = new Command(validCommandUndefinedCanBeChannelRestrictedUserCommand, newSettings());
      assert(!command1.createEnabledSetting());
      assert(command2.createEnabledSetting());
    });
  });
  describe('handle()', async function() {
    it('should not execute if not cooled down', async function() {
      let command = new Command(validCommandDataWithCooldown, newSettings());
      assert(command.getCooldown() === validCommandDataWithCooldown.cooldown);
      const result1 = await command.handle(null, MsgNoPerms, '', '', config);
      try {
        await command.handle(null, MsgNoPerms, '', '', config);
        assert(false);
      } catch (err) {
        if (err.code === 'ERR_ASSERTION') {
          throw err;
        }
      }
    });
    it('should execute if cooled down', function(done) {
      let command = new Command(validCommandDataWithCooldown, newSettings());
      command.handle(null, MsgNoPerms, '', '', config).then(invoke1Result => {
        setTimeout(() => {
          command.handle(null, MsgNoPerms, '', '', config).then(invoke2Result => {
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
    it('should not execute if user must be a bot admin but is not', async function() {
      let command = new Command(validCommandDataBotAdminOnly, newSettings());
      try {
        await command.handle(null, MsgNoPerms, '', '', config);
        await command.handle(null, MsgIsServerAdminWithTag, '', '', config);
        assert(false);
      } catch (err) {
        if (err.code === 'ERR_ASSERTION') {
          throw err;
        }
      }

      assert(command.getIsForBotAdminOnly());
    });
    it('should execute if user must be a bot admin and is', function() {
      let command = new Command(validCommandDataBotAdminOnly, newSettings());
      return command.handle(null, MsgIsBotAdmin, '', '', config).then(invoke1Result => {
        assert(invoke1Result === undefined && command.invoked);
      });
    });
    it('should not execute if must be in server but is not', async function() {
      let command = new Command(validCommandServerOnly, newSettings());
      try {
        await command.handle(null, MsgDM, '', '', config);
        assert(false);
      } catch (err) {
        if (err.code === 'ERR_ASSERTION') {
          throw err;
        }
      }
    });
    it('should execute if must be in server and is', function() {
      let command = new Command(validCommandServerOnly, newSettings());
      return command.handle(null, MsgNoPerms, '', '', config).then(() => {
        assert(command.invoked);
      });
    });
    it('should not execute if user must be a server admin but is not', async function() {
      let command = new Command(validCommandDataServerAdminOnly, newSettings());
      try {
        await command.handle(null, MsgNoPerms, '', '', config);
        assert(false);
      } catch (err) {
        if (err.code === 'ERR_ASSERTION') {
          throw err;
        }
      }
    });
    it('should execute if user must be a server admin, is not, but its a DM', function() {
      let command = new Command(validCommandDataServerAdminOnly, newSettings());
      return command.handle(null, MsgDM, '', '', config).then(() => {
        assert(command.invoked);
      });
    });
    it('should execute if user must be a server admin and is', function() {
      let command = new Command(validCommandDataServerAdminOnly, newSettings());
      return command.handle(null, MsgIsBotAdmin, '', '', config).then(invokeResult => {
        assert(command.getIsForServerAdminOnly());
        assert(invokeResult === undefined && command.invoked);
        command = new Command(validCommandDataServerAdminOnly, newSettings());
        return command.handle(null, MsgIsServerAdminWithTag, '', '', config).then(invokeResult => {
          assert(invokeResult === undefined && command.invoked);
          command = new Command(validCommandDataServerAdminOnly, newSettings());
          return command.handle(null, MsgIsServerAdmin, '', '', config).then(invokeResult => {
            assert(invokeResult === undefined && command.invoked);
            command = new Command(validCommandDataServerAdminOnly, newSettings());
            return command.handle(null, MsgIsBotAndServerAdmin, '', '', config).then(invokeResult => {
              assert(invokeResult === undefined && command.invoked);
            });
          });
        });
      });
    });
    it('should throw if disabled', async function() {
      const settings = newSettings();
      let command = new Command(validCommandDataWithCooldown, settings);
      await disableCommand(settings, command, MsgNoPerms.channel.guild.id);

      try {
        await command.handle(null, MsgNoPerms, '', '', config);
        assert(false);
      } catch (err) {
        if (err.code === 'ERR_ASSERTION') {
          throw err;
        }
      }
    });
  });
  describe('createEnabledSetting()', function() {
    it('should return a valid setting that the settings can load', function() {
      let logger = new MockLogger();
      let command = new Command(validCommandServerOnly, newSettings());
      let setting = command.createEnabledSetting();
      let settings = newSettings();
      settings.addNodeToRoot(setting);
    });
  });
});
