function serializeUser(user) {
  if (!user) {
    return 'Unknown';
  }

  return {
    avatarUri: user.avatarURL,
    username: user.username,
    discriminator: user.discriminator,
    id: user.id,
  };
}

function serializeGuild(guild) {
  if (!guild) {
    return 'Direct Message';
  }

  return {
    name: guild.name,
    memberCount: guild.memberCount,
    owner: serializeUser(guild.members.get(guild.ownerID)),
    joinedAt: guild.joinedAt,
    iconUri: guild.iconURL,
    createdAt: guild.createdAt,
  };
}

function serializeChannel(channel) {
  if (!channel) {
    return 'Unknown';
  }

  if (!channel.guild) {
    return 'Direct Message';
  }

  return {
    name: channel.name,
    id: channel.id,
  };
}

function serializeMessage(msg) {
  if (!msg) {
    return 'None';
  }

  return {
    content: msg.content,
    embeds: msg.embeds,
  };
}

module.exports = {
  user: serializeUser,
  guild: serializeGuild,
  channel: serializeChannel,
  message: serializeMessage,
};
