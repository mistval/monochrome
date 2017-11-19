module.exports = {
  commandAliases: '4',
  uniqueId: '4',
  canBeChannelRestricted: true,
  action(bot, msg, suffix) {
    throw new Error('Oh no!');
  },
};
