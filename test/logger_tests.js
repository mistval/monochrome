const Logger = require('./../core/logger.js');
const MockMessage = require('./mock_objects/mock_message.js');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mockConsole = require('./mock_objects/mock_console.js');

describe('Logger', function() {
  it('Does not throw when you call logInputReaction()' , function() {
    const logger = new Logger(undefined, undefined, mockConsole);
    logger.logInputReaction('Title', MockMessage.simpleDMMessage, 'Reactor title', true);
    logger.logInputReaction('Title', MockMessage.simpleDMMessage, 'Reactor title', false);
    logger.logInputReaction('Title', MockMessage.simpleDMMessage, 'Reactor title', false, 'Error message');
    logger.logInputReaction('Title', MockMessage.simpleGuildMessage, 'Reactor title', true);
  });
  it('Does not throw when you call logSuccess' , function() {
    const logger = new Logger(undefined, undefined, mockConsole);
    logger.logSuccess('Success', 'Wee, success');
  });
  it('Does not throw when you call logFailure' , function() {
    const logger = new Logger(undefined, undefined, mockConsole);
    logger.logFailure('Fail', 'Aww, fail');
    logger.logFailure('Fail', 'Aww, fail', new Error());
  });
  it('Does not throw when you call close' , function() {
    const logger = new Logger(undefined, undefined, mockConsole);
    logger.close();
  });
  it('Does throw when you try to use it after closing it' , function() {
    const logger = new Logger(undefined, undefined, mockConsole);
    logger.close();
    assert.throws(() => logger.logFailure('Fail', 'Aww, fail'), 'Did not throw');
  });
  it('Creates a real live log file', function() {
    const logger = new Logger(__dirname, undefined, mockConsole);
    logger.logSuccess('Success', 'Wee, success');
    const dirContents = fs.readdirSync(__dirname);
    const logFileName = dirContents.find(dirContent => dirContent.startsWith(Logger.LOG_FILE_PREFIX));
    assert(!!logFileName, 'No log file');
    fs.unlinkSync(path.join(__dirname, logFileName));
  });
});
