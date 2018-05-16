function userIsServerAdmin(msg, config) {
  if (!msg.channel.guild) {
    return true;
  }

  if (!msg.member) {
    return false;
  }

  let permission = msg.member.permission.json;
  if (permission.manageGuild || permission.administrator || permission.manageChannels) {
    return true;
  }

  let serverAdminRole = msg.channel.guild.roles.find((role) => {
    return role.name.toLowerCase() === config.serverAdminRoleName.toLowerCase();
  });

  if (serverAdminRole && msg.member.roles.indexOf(serverAdminRole.id) !== -1) {
    return true;
  }

  if (config.botAdminIds.indexOf(msg.author.id) !== -1) {
    return true;
  }

  return false;
}

module.exports = userIsServerAdmin;
