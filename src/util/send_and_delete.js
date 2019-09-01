async function sendAndDelete(msg, messageToSend, logger, deleteAfterMs) {
  const sentMessage = await msg.channel.createMessage(messageToSend, null, msg);
  setTimeout(
    async () => {
      try {
        await sentMessage.delete('Auto delete error message');
      } catch (err) {
        logger.warn({
          event: 'ERROR AUTO DELETING MESSAGE',
          message: msg,
          err,
        });
      }
    },
    deleteAfterMs,
  );

  return sentMessage;
}

module.exports = sendAndDelete;
