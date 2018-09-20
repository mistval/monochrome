const PublicError = require('./public_error.js');

const BLACKLIST_PERSISTENCE_KEY = 'blacklist';

function getWriteableChannel(bot, guild) {
  return guild.channels.find(
    channel => channel.type === 0 && channel.permissionsOf(bot.user.id).json.sendMessages);
}

async function leaveGuildWithExplanation(bot, guild, reason) {
  const writeableChannel = getWriteableChannel(bot, guild);
  if (writeableChannel) {
    await writeableChannel.createMessage(`I'm leaving this guild because its owner was blacklisted from using me.\n\nBlacklist reason: \`\`\`${reason}\`\`\``);
  }

  return guild.leave();
}

function leaveGuildsWithExplanation(bot, guilds, reason) {
  return Promise.all(guilds.map(guild => leaveGuildWithExplanation(bot, guild, reason)));
}

class Blacklist {
  constructor(bot, persistence, botAdminIds) {
    this.reasonForUserId_ = {};
    this.persistence_ = persistence;
    this.botAdminIds_ = botAdminIds;
    this.bot_ = bot;

    persistence.getData(BLACKLIST_PERSISTENCE_KEY).then(data => {
      this.reasonForUserId_ = data;
    });
  }

  async blacklistUser(userId, reason) {
    if (this.botAdminIds_.indexOf(userId) !== -1) {
      throw PublicError.createWithCustomPublicMessage(`<@${userId}> is a bot admin and can't be blacklisted.`, true, 'User is a bot admin');
    }

    this.reasonForUserId_[userId] = reason;
    await this.updatePersistence_();

    const blacklistedGuilds = this.bot_.guilds.filter(guild => guild.ownerID === userId);
    return leaveGuildsWithExplanation(this.bot_, blacklistedGuilds, reason);
  }

  leaveGuildIfBlacklisted(guild) {
    const blacklisted = this.isUserBlacklisted(guild.ownerID);
    if (!blacklisted) {
      return;
    }

    const reason = this.reasonForUserId_[guild.ownerID];
    return leaveGuildWithExplanation(this.bot_, guild, reason);
  }

  unblacklistUser(userId) {
    delete this.reasonForUserId_[userId];
    return this.updatePersistence_();
  }

  isUserBlacklisted(userId) {
    return !!this.reasonForUserId_[userId];
  }

  updatePersistence_() {
    return this.persistence_.editData(BLACKLIST_PERSISTENCE_KEY, () => this.reasonForUserId_);
  }
}

module.exports = Blacklist;
