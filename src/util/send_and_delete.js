async function sendAndDelete(msg, messageToSend, logger, deleteAfterMs) {
  const sentMessage = await msg.channel.createMessage(messageToSend, null, msg);
  setTimeout(
    () => {
      sentMessage.delete('Auto delete error message').catch((err) => {
        logger.warn({
          message: msg,
          msg: 'Error trying to automatically delete error message',
          err,
        })
      });
    },
    deleteAfterMs,
  );

  return sentMessage;
}
