const FulfillmentError = require('./fulfillment_error.js');
const sendAndDelete = require('./util/send_and_delete.js');

const MISSING_PERMS_DISCORD_ERROR_SUBSTR = 'Missing Permissions';
const DELETION_TIME_MS = 10000;

function tryConvertFromPermissionError(error, missingPermissionsPublicMessage) {
  if (error.message.indexOf(MISSING_PERMS_DISCORD_ERROR_SUBSTR) !== -1) {
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
      publicMessage = silent ? fulfillmentError.publicMessage : '';
      internalError = fulfillmentError.error;
      logDescription = fulfillmentError.logDescription || 'Error';
      autoDeletePublicMessage = fulfillmentError.autoDeletePublicMessage || false;
      logLevel = fulfillmentError.logLevel || 'warn';
    } else {
      publicMessage = silent ? genericErrorMessage : '';
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
      if (autoDeletePublicMessage) {
        await sendAndDelete(msg, publicMessage, logger, DELETION_TIME_MS);
      } else {
        await msg.channel.createMessage(publicMessage, null, msg);
      }
    }
  } catch (err) {
    logger.fatal({
      event: 'ERROR HANDLING ERROR',
      err,
      message: msg,
    });
  }
}

module.exports = handleError;
