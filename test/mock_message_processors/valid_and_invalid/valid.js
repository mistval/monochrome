module.exports = {
  name: 'Name',
  action(bot, msg, monochrome) {
    if (msg.content === 'hello') {
      this.invoked = true;
      return true;
    }
    return false;
  },
};
