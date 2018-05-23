module.exports = {
  name: 'Name',
  action(bot, msg, monochrome) {
    if (msg.content === 'hello2') {
      this.invoked = true;
      return true;
    }
    return false;
  },
};
