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

function tryConvertToFulfillmentError(error, missingPermissionsPublicMessage) {
  if (error instanceof FulfillmentError) {
    return error;
  }

  const fulfillmentError = tryConvertFromPermissionError(error, missingPermissionsPublicMessage);
  return fulfillmentError;
}

async function handleError(logger, event, monochrome, msg, error, silent) {
  try {
    const missingPermissionsErrorMessage = monochrome.getMissingPermissionsErrorMessage();
    const genericErrorMessage = monochrome.getGenericErrorMessage();

    const fulfillmentError = tryConvertToFulfillmentError(error, missingPermissionsErrorMessage);
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
      publicMessage = silent ? '' : genericErrorMessage;
      internalError = error;
      logDescription = 'Error';
      autoDeletePublicMessage = false;
      logLevel = 'error';
    }

    logger[logLevel]({
      event,
      err: internalError,
      msg: logDescription,
      message: msg,
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
