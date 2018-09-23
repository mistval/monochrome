const MockGuild = require('./mock_guild.js');

module.exports.simpleDMChannel = {
  name: 'A channel',
};

module.exports.simpleGuildChannel = {
  name: 'A channel',
  guild: MockGuild.simpleGuild,
};
