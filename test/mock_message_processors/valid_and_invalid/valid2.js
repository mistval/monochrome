module.exports = {
  name: 'Name',
  action(bot, monochrome, msg) {
    if (msg.content === 'hello2') {
      this.invoked = true;
      return true;
    }
    return false;
  },
};
