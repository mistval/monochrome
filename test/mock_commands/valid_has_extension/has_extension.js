let invoked = false;
let correctExtension = false;

module.exports = {
  commandAliases: 'bot!about',
  canBeChannelRestricted: false,
  action(erisBot, monochrome, msg, suffix, settings, extension) {
    invoked = true;
    correctExtension = extension === 'extension';
  },
  canHandleExtension(extension) {
    invoked = false;
    correctExtension = false;
    return extension === 'extension';
  },
  validateInvoked() {
    return invoked && correctExtension;
  },
};
