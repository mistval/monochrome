const assert = require('assert');
const FulfillmentError = require('./fulfillment_error.js');
const sendAndDelete = require('./util/send_and_delete.js');

const DELETION_TIME_MS = 10000;

function tryConvertFromPermissionError(error, missingPermissionsPublicMessage) {
  if (error.code === 50001 || error.code === 50013) {
    return new FulfillmentError({
      publicMessage: missingPermissionsPublicMessage,
      logDescription: 'Insufficient privileges',
      error,
    });
  }

  return undefined;
}

function tryConvertFromDiscordInternalError(error, discordInternalErrorMessage) {
  if (error.code === 500 && error.name === 'DiscordHTTPError') {
    return new FulfillmentError({
      publicMessage: discordInternalErrorMessage,
      logDescription: 'Discord internal error',
      error,
    });
  }

  return undefined;
}

function tryConvertToFulfillmentError(error, monochrome) {
  if (error instanceof FulfillmentError) {
    return error;
  }

  const fulfillmentError = tryConvertFromPermissionError(
    error,
    monochrome.getMissingPermissionsErrorMessage(),
  ) || tryConvertFromDiscordInternalError(
    error,
    monochrome.getDiscordInternalErrorMessage(),
  );

  return fulfillmentError;
}

async function handleError(logger, event, monochrome, msg, error, silent, additionalFields) {
  try {
    assert(logger.warn && logger.error, 'logger does not implement the expected API');
    assert(
      monochrome.getGenericErrorMessage
      && monochrome.getMissingPermissionsErrorMessage
      && monochrome.getDiscordInternalErrorMessage,
      'monochrome does not implement the expected API',
    );
    assert(msg.channel && msg.channel.createMessage, 'msg does not implement the expected API');
    assert(typeof silent === 'boolean', 'Must specify silent argument');

    const fulfillmentError = tryConvertToFulfillmentError(error, monochrome);
    let publicMessage;
    let internalError;
    let logDescription;
    let autoDeletePublicMessage;
    let logLevel;

    if (fulfillmentError) {
      publicMessage = silent ? '' : fulfillmentError.publicMessage;
      internalError = fulfillmentError.error;
      logDescription = fulfillmentError.logDescription || 'Error';
      autoDeletePublicMessage = fulfillmentError.autoDeletePublicMessage || false;
      logLevel = fulfillmentError.logLevel;
    } else {
      publicMessage = silent ? '' : monochrome.getGenericErrorMessage();
      internalError = error;
      logDescription = 'Error';
      autoDeletePublicMessage = false;
      logLevel = 'error';
    }

    logger[logLevel]({
      event,
      err: internalError,
      detail: logDescription,
      message: msg,
      ...additionalFields,
    });

    if (publicMessage) {
      try {
        if (autoDeletePublicMessage) {
          await sendAndDelete(msg, publicMessage, logger, DELETION_TIME_MS);
        } else {
          await msg.channel.createMessage(publicMessage, null, msg);
        }
      } catch (err) {
        logger.warn({
          event: 'ERROR SENDING ERROR',
          err,
          message: msg,
        });
      }
    }
  } catch (err) {
    logger.error({
      event: 'ERROR HANDLING ERROR',
      err,
      message: msg,
    });
  }
}

module.exports = handleError;
