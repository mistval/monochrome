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
    joinedAt: guild.joinedAt,
    iconUri: guild.iconURL,
    createdAt: guild.createdAt,
    id: guild.id,
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
    guild: serializeGuild(channel.guild),
  };
}

function serializeMessage(msg) {
  if (!msg) {
    return 'None';
  }

  return {
    content: '<REDACTED_MESSAGE_CONTENT>',
    embeds: msg.embeds,
    id: msg.id,
    author: serializeUser(msg.author),
    channel: serializeChannel(msg.channel),
  };
}

function serializeErr(err) {
  if (!err) {
    return 'None';
  }

  return {
    message: err.message,
    code: err.code,
    stack: err.stack,
    asString: err.toString(),
    innerErr: serializeErr(err.error),
  };
}

module.exports = {
  user: serializeUser,
  guild: serializeGuild,
  channel: serializeChannel,
  message: serializeMessage,
  err: serializeErr,
};
