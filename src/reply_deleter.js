const Eris = require('@projectdysnomia/dysnomia');

const ownerIdForSentMessageId = {};
const responseMessageIdForCommandMessageId = {};

const deletionEmoji = {
  '✖': true,
  '❌': true,
};

const oldChannelCreateMessageProtoype = Eris.TextChannel.prototype.createMessage;
Eris.TextChannel.prototype.createMessage = function(content, file, messageInResponseTo) {
  return oldChannelCreateMessageProtoype.call(this, content, file).then(sentMessage => {
    if (messageInResponseTo) {
      ownerIdForSentMessageId[sentMessage.id] = messageInResponseTo.author.id;
      responseMessageIdForCommandMessageId[messageInResponseTo.id] = sentMessage.id;
    }
    return sentMessage;
  });
};

const oldBotCreateMessageProtoype = Eris.Client.prototype.createMessage;
Eris.Client.prototype.createMessage = function(channelId, content, file, messageInResponseTo) {
  return oldBotCreateMessageProtoype.call(this, channelId, content, file).then(sentMessage => {
    if (messageInResponseTo) {
      ownerIdForSentMessageId[sentMessage.id] = messageInResponseTo.author.id;
      responseMessageIdForCommandMessageId[messageInResponseTo.id] = sentMessage.id;
    }
    return sentMessage;
  });
};

async function handleMessageDeleted(bot, deletedMsg, logger) {
  let responseMessageId = responseMessageIdForCommandMessageId[deletedMsg.id];
  if (responseMessageId) {
    try {
      await bot.deleteMessage(deletedMsg.channel.id, responseMessageId, 'The message that invoked the command was deleted.');
    } catch (err) {
      if (err.code !== 10008) { // Ignore unknown message
        logger.warn({
          event: 'FAILED TO DELETE MESSAGE IN RESPONSE TO USER MESSAGE DELETION',
          message: deletedMsg,
          err,
        });
      }
    }
  }
}

async function handleReaction(msg, userId, emoji, logger) {
  let ownerId = ownerIdForSentMessageId[msg.id];
  if (ownerId && userId === ownerId && deletionEmoji[emoji.name]) {
    try {
      await msg.channel.deleteMessage(msg.id, 'User who invoked the command reacted with X to delete it.');
    } catch (err) {
      if (err.code !== 10008) { // Ignore unknown message
        logger.warn({
          event: 'FAILED TO DELETE MESSAGE IN RESPONSE TO USER ❌ REACTION',
          message: deletedMsg,
          err,
        });
      }
    }
  }
}

module.exports = {
  handleMessageDeleted,
  handleReaction,
};
