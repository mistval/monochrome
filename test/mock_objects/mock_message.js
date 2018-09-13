const MockChannel = require('./mock_channel.js');
const MockUser = require('./mock_user.js');

class MockMessage {
  constructor(messageObject) {
    const copy = JSON.parse(JSON.stringify(messageObject));
    Object.assign(this, copy);
  }

  setChannel(channel) {
    const newMessage = new MockMessage(this);
    newMessage.channel = channel;
    return newMessage;
  }
}

const baseMessage = new MockMessage({
  channel: MockChannel.simpleDMChannel,
  author: MockUser.simpleUser,
  content: 'Some content',
});

const simpleDMMessage = new MockMessage(baseMessage);
const simpleGuildMessage = baseMessage.setChannel(MockChannel.simpleGuildChannel);

module.exports = {
  simpleDMMessage,
  simpleGuildMessage,
};
