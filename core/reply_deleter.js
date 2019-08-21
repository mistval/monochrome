const Eris = require('eris');

const LOGGER_TITLE = 'DELETE MESSAGE';

const ownerIdForSentMessageId = {};
const responseMessageIdForCommandMessageId = {};

const deletionEmoji = {
  '✖': true,
  '❌': true,
};

const oldCreateMessageProtoype = Eris.TextChannel.prototype.createMessage;
Eris.TextChannel.prototype.createMessage = function(content, file, messageInResponseTo) {
  return oldCreateMessageProtoype.call(this, content, file).then(sentMessage => {
    if (messageInResponseTo) {
      ownerIdForSentMessageId[sentMessage.id] = messageInResponseTo.author.id;
      responseMessageIdForCommandMessageId[messageInResponseTo.id] = sentMessage.id;
    }
    return sentMessage;
  });
};

async function handleMessageDeleted(deletedMsg, logger) {
  let responseMessageId = responseMessageIdForCommandMessageId[deletedMsg.id];
  if (responseMessageId) {
    try {
      await deletedMsg.channel.deleteMessage(responseMessageId, 'The message that invoked the command was deleted.');
      logger.logSuccess(LOGGER_TITLE, 'Deleted bot message in response to user message deletion.');
    } catch (err) {
      logger.logFailure(LOGGER_TITLE, 'Failed to delete bot message in response to user message deletion', err);
    }
  }
}

async function handleReaction(msg, userId, emoji, logger) {
  let ownerId = ownerIdForSentMessageId[msg.id];
  if (ownerId && userId === ownerId && deletionEmoji[emoji.name]) {
    try {
      await msg.channel.deleteMessage(msg.id, 'User who invoked the command reacted with X to delete it.');
      logger.logSuccess(LOGGER_TITLE, 'Deleted bot message in response to user ❌ reaction.');
    } catch (err) {
      logger.logFailure(LOGGER_TITLE, 'Failed to delete bot message in response to user ❌ reaction', err);
    }
  }
}

module.exports = {
  handleMessageDeleted,
  handleReaction,
};
