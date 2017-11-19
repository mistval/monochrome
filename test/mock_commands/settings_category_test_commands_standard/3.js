module.exports = {
  commandAliases: '3',
  uniqueId: '3',
  canBeChannelRestricted: true,
  action(bot, msg, suffix) {
    throw new Error('Oh no!');
  },
};
