module.exports = {
  commandAliases: '1',
  uniqueId: '1',
  canBeChannelRestricted: true,
  action(bot, msg, suffix) {
    throw new Error('Oh no!');
  },
};
