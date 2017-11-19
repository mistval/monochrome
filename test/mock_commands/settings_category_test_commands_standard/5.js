module.exports = {
  commandAliases: '5',
  uniqueId: '5',
  canBeChannelRestricted: true,
  action(bot, msg, suffix) {
    throw new Error('Oh no!');
  },
};
