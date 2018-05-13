module.exports = {
  commandAliases: 'bot!about',
  uniqueId: 'not_unique',
  action(bot, msg, suffix) {
    this.invoked = true;
  },
};
