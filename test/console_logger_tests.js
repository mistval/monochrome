const { assert } = require('chai');
const ConsoleLogger = require('./../src/console_logger.js');

const logFunctions = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
];

const testUser = { username: 'Test user', discriminator: '5432' };
const testGuild = { name: 'Test guild' };
const testChannel = { name: 'Test channel' };
const testMessage = { content: 'Beep boop' };

function noop() {
  // NOOP
}

function assertThrows(logFn, info) {
  it(`Throws for input: ${JSON.stringify(info)}`, () => {
    const consoleLogger = new ConsoleLogger('Test::Core', noop, noop);
    assert.throw(() => consoleLogger[logFn](info));
  });
}

function assertDoesNotThrow(logFn, info) {
  it(`Does not throw input: ${JSON.stringify(info)}`, () => {
    const consoleLogger = new ConsoleLogger('Test::Core', noop, noop);
    assert.doesNotThrow(() => consoleLogger[logFn](info));
  });
}

const testCases = [
  {
    testFn: assertThrows,
    testInput: undefined,
  },
  {
    testFn: assertDoesNotThrow,
    testInput: {},
  },
  {
    testFn: assertDoesNotThrow,
    testInput: 'Test',
  },
  {
    testFn: assertDoesNotThrow,
    testInput: { msg: 'Test' },
  },
  {
    testFn: assertDoesNotThrow,
    testInput: { user: testUser },
  },
  {
    testFn: assertDoesNotThrow,
    testInput: {
      user: testUser,
      guild: testGuild,
    },
  },
  {
    testFn: assertDoesNotThrow,
    testInput: {
      event: 'USER INVADED THEIR OWN DREAMS WITH LEONARDO DICAPRIO',
      user: testUser,
      guild: testGuild,
      channel: testChannel,
    },
  },
  {
    testFn: assertDoesNotThrow,
    testInput: {
      user: testUser,
      guild: testGuild,
      channel: testChannel,
      message: testMessage,
    },
  },
  {
    testFn: assertDoesNotThrow,
    testInput: {
      user: testUser,
      guild: testGuild,
      channel: testChannel,
      message: testMessage,
      msg: 'Bong',
      err: new Error('Test error'),
    },
  },
];

logFunctions.forEach((logFn) => {
  describe(`Function '${logFn}'`, () => {
    testCases.forEach((testCase) => {
      testCase.testFn(logFn, testCase.testInput);
    });
  });
});

describe('Child logger', function() {
  it('Does not throw when called', function() {
    const parentLogger = new ConsoleLogger('Test::Parent', noop, noop);
    const childLogger = parentLogger.child({ component: 'Test::Child' });
    childLogger.error('Test');
  });
});
