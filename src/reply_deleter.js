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
      logger.info({
        event: 'DELETED MESSAGE IN RESPONSE TO USER MESSAGE DELETION',
        message: deletedMsg,
        guild: deletedMsg.channel.guild,
        channel: deletedMsg.channel,
        user: deletedMsg.author,
      });
    } catch (err) {
      logger.warn({
        event: 'ERROR DELETING MESSAGE IN RESPONSE TO USER MESSAGE DELETION',
        message: deletedMsg,
        guild: deletedMsg.channel.guild,
        channel: deletedMsg.channel,
        user: deletedMsg.author,
      });
    }
  }
}

async function handleReaction(msg, userId, emoji, logger) {
  let ownerId = ownerIdForSentMessageId[msg.id];
  if (ownerId && userId === ownerId && deletionEmoji[emoji.name]) {
    try {
      await msg.channel.deleteMessage(msg.id, 'User who invoked the command reacted with X to delete it.');
      logger.info({
        event: 'DELETED MESSAGE IN RESPONSE TO USER ❌ REACTION',
        message: deletedMsg,
        guild: deletedMsg.channel.guild,
        channel: deletedMsg.channel,
        user: deletedMsg.author,
      });
    } catch (err) {
      logger.warn({
        event: 'FAILED TO DELETE MESSAGE IN RESPONSE TO USER ❌ REACTION',
        message: deletedMsg,
        guild: deletedMsg.channel.guild,
        channel: deletedMsg.channel,
        user: deletedMsg.author,
      });
    }
  }
}

module.exports = {
  handleMessageDeleted,
  handleReaction,
};
