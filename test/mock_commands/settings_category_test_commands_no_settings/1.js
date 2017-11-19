module.exports = {
  commandAliases: '1',
  uniqueId: '1',
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    throw new Error('Oh no!');
  },
};
