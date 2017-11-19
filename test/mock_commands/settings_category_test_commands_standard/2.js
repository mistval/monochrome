module.exports = {
  commandAliases: '2',
  uniqueId: '2',
  canBeChannelRestricted: true,
  action(bot, msg, suffix) {
    throw new Error('Oh no!');
  },
};
