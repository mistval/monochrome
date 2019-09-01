const sinon = require('sinon');
const handleError = require('./../src/handle_error.js');
const assert = require('chai').assert;
const ConsoleLogger = require('./../src/console_logger.js');
const FulfillmentError = require('./../src/fulfillment_error.js');
const Monochrome = require('./../monochrome.js');

const monochrome = new Monochrome({
  botToken: 'test',
  genericErrorMessage: 'There was an error. Sorry!',
  missingPermissionsErrorMessage: 'Missing permissions, sorry.',
});

function createMockChannel(messageToReturnFromCreateMessage) {
  return {
    createMessage: sinon.fake.returns(messageToReturnFromCreateMessage),
    permissionsOf: sinon.fake.returns({ json: { sendMessages: true } }),
  };
}

function createMockMessage(messageToReturnFromCreateMessage) {
  return {
    channel: createMockChannel(messageToReturnFromCreateMessage),
    delete: sinon.fake(),
  };
}

function createMockLogger() {
  const logger = new ConsoleLogger();
  sinon.stub(logger, 'error');
  sinon.stub(logger, 'warn');
  sinon.stub(logger, 'trace');
  return logger;
}

describe('Command/MP error handler', function() {
  it('Logs an error if error is not a FulfillmentError', function() {
    const logger = createMockLogger();
    handleError(logger, 'Test', monochrome, createMockMessage(), new Error('test'), false);
    sinon.assert.called(logger.error);
    sinon.assert.notCalled(logger.warn);
  });
  it('Logs a warning if error is a FulfillmentError', function() {
    const logger = createMockLogger();
    handleError(logger, 'Test', monochrome, createMockMessage(), new FulfillmentError({}), false);
    sinon.assert.called(logger.warn);
    sinon.assert.notCalled(logger.error);
  });
  it('Sends a generic message to the channel if silent is false (normal Error)', function() {
    const logger = createMockLogger();
    const msg = createMockMessage();
    handleError(logger, 'Test', monochrome, msg, new Error(), false);
    sinon.assert.calledWith(msg.channel.createMessage, monochrome.getGenericErrorMessage(), null, msg);
  });
  it('Sends the specified message to the channel if silent is false (FulfillmentError)', function() {
    const logger = createMockLogger();
    const msg = createMockMessage();
    const error = new FulfillmentError({ publicMessage: 'Hihi' });
    handleError(logger, 'Test', monochrome, msg, error, false);
    sinon.assert.calledWith(msg.channel.createMessage, error.publicMessage, null, msg);
  });
  it('Does not send an error message if silent is true (normal Error)', function() {
    const logger = createMockLogger();
    const msg = createMockMessage();
    handleError(logger, 'Test', monochrome, msg, new Error(), true);
    sinon.assert.notCalled(msg.channel.createMessage);
  });
  it('Does not send an error message if silent is true (FulfillmentError)', function() {
    const logger = createMockLogger();
    const msg = createMockMessage();
    const error = new FulfillmentError({ publicMessage: 'Hihi' });
    handleError(logger, 'Test', monochrome, msg, error, true);
    sinon.assert.notCalled(msg.channel.createMessage);
  });
  it('Sends missing permission message for missing permission error', function() {
    const logger = createMockLogger();
    const msg = createMockMessage();
    const error = new Error();
    error.code = 50001;
    handleError(logger, 'Test', monochrome, msg, error, false);
    sinon.assert.calledWith(msg.channel.createMessage, monochrome.getMissingPermissionsErrorMessage(), null, msg);
  });
  it('Auto-deletes sent error message', async function() {
    const clock = sinon.useFakeTimers();
    const logger = createMockLogger();
    const botResponse = createMockMessage();
    const msg = createMockMessage(botResponse);
    const error = new FulfillmentError({
      publicMessage: 'Something went wrong',
      autoDeletePublicMessage: true,
    });

    handleError(logger, 'Test', monochrome, msg, error, false);
    await Promise.resolve();

    clock.tick(20000);
    sinon.assert.called(botResponse.delete);
    clock.restore();
  });
  it('Warns if fail to send error message to user', async function() {
    const logger = createMockLogger();
    const msg = createMockMessage();
    msg.channel.createMessage = sinon.stub().throws();
    handleError(logger, 'Test', monochrome, msg, new Error(), false);
    sinon.assert.calledWith(logger.warn, sinon.match({ event: 'ERROR SENDING ERROR' }));
  });
  it('Errors if unexpected error occurs', function() {
    const logger = createMockLogger();
    const mockMonochrome = { ...monochrome };
    mockMonochrome.getGenericErrorMessage = sinon.stub().throws();
    const msg = createMockMessage();
    handleError(logger, 'Test', mockMonochrome, msg, new Error(), false);
    sinon.assert.calledWith(logger.error, sinon.match({ event: 'ERROR HANDLING ERROR' }));
  });
  it('Allows specifying the log level of FulfillmentErrors', function() {
    const logger = createMockLogger();
    const msg = createMockMessage();
    const error = new FulfillmentError({ publicMessage: 'hi', logLevel: 'trace' });
    handleError(logger, 'Test', monochrome, msg, error, false);
    sinon.assert.called(logger.trace);
  });
});


