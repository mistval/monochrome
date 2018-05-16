module.exports = {
  commandAliases: 'bot!help',
  uniqueId: 'not_unique',
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
