const LOGGER_TITLE = 'DELETE MESSAGE';

const ownerIdForSentMessageId = {};
const responseMessageIdForCommandMessageId = {};

function initialize(eris) {
  let oldCreateMessageProtoype = eris.TextChannel.prototype.createMessage;
  eris.TextChannel.prototype.createMessage = function(content, file, messageInResponseTo) {
    return oldCreateMessageProtoype.call(this, content, file).then(sentMessage => {
      if (messageInResponseTo) {
        ownerIdForSentMessageId[sentMessage.id] = messageInResponseTo.author.id;
        responseMessageIdForCommandMessageId[messageInResponseTo.id] = sentMessage.id;
      }
      return sentMessage;
    });
  };
}

function handleMessageDeleted(deletedMsg, logger) {
  let responseMessageId = responseMessageIdForCommandMessageId[deletedMsg.id];
  if (responseMessageId) {
    deletedMsg.channel.deleteMessage(responseMessageId, 'The message that invoked the command was deleted.').catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Failed to delete bot message in response to user message deletion', err);
    });
  }
}

function handleReaction(msg, userId, emoji, logger) {
  let ownerId = ownerIdForSentMessageId[msg.id];
  if (ownerId && userId === ownerId && emoji.name === '❌') {
    msg.channel.deleteMessage(msg.id, 'User who invoked the command reacted with ❌ to delete it.').catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Failed to delete bot message in response to user message deletion', err);
    });
  }
}

module.exports.initialize = initialize;
module.exports.handleMessageDeleted = handleMessageDeleted;
module.exports.handleReaction = handleReaction;
