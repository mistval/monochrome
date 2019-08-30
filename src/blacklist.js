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

/**
 * Maintains a list of blacklisted users with whom the bot should not interact.
 * The final resting place of command spammers and people you don't like.
 * The Blacklist can be accessed via {@link Monochrome#getBlacklist}.
 * See [the demo blacklist]{@link https://github.com/mistval/monochrome-demo/blob/master/commands/blacklist.js}
 * and [demo unblacklist]{@link https://github.com/mistval/monochrome-demo/blob/master/commands/unblacklist.js}
 * commands for examples of using the blacklist. The demo commands can be used in your bot without requiring any modification.
 * @hideconstructor
 */
class Blacklist {
  constructor(bot, persistence, botAdminIds) {
    this.reasonForUserId_ = {};
    this.persistence_ = persistence;
    this.botAdminIds_ = botAdminIds;
    this.bot_ = bot;

    this.ready = persistence.getData(BLACKLIST_PERSISTENCE_KEY).then(data => {
      this.reasonForUserId_ = data;
    });
  }

  /**
  * Blacklist a user. The user will be completely ignored by the bot, and any guilds
  * that they own will be left.
  * @param {string} userId - The ID of the user to blacklist.
  * @param {string} reason - The reason the user was blacklisted. If the user is a guild owner,
  *   the bot will send a message with this reason to a channel in the guild before leaving.
  *   If the user is not a guild owner, they will just be silently ignored and will not see
  *   this reason.
  */
  async blacklistUser(userId, reason) {
    await this.ready;
    if (this.botAdminIds_.indexOf(userId) !== -1) {
      throw PublicError.createWithCustomPublicMessage(`<@${userId}> is a bot admin and can't be blacklisted.`, true, 'User is a bot admin');
    }

    this.reasonForUserId_[userId] = reason;
    await this.updatePersistence_();

    const blacklistedGuilds = this.bot_.guilds.filter(guild => guild.ownerID === userId);
    return leaveGuildsWithExplanation(this.bot_, blacklistedGuilds, reason);
  }

  async leaveGuildIfBlacklisted(guild) {
    await this.ready;
    const blacklisted = await this.isUserBlacklisted(guild.ownerID);
    if (!blacklisted) {
      return false;
    }

    const reason = this.reasonForUserId_[guild.ownerID];
    await leaveGuildWithExplanation(this.bot_, guild, reason);
    return true;
  }

  /**
   * Remove a user from the blacklist so that they can interact with the bot again.
   * @param {string} userId - The ID of the user to unblacklist.
   */
  async unblacklistUser(userId) {
    await this.ready;
    delete this.reasonForUserId_[userId];
    return this.updatePersistence_();
  }

  /**
   * Check if a user is blacklisted without first checking if the blacklist
   * has loaded. This function is meant to be called in hot paths and may incorrectly
   * return false if called immediately after the bot is started. Consider using
   * {@link Blacklist#isUserBlacklisted} instead. It will always return the correct result.
   * @param {string} userId - The ID of the user to check the blacklist for.
   * @return {boolean}
   */
  isUserBlacklistedQuick(userId) {
    return !!this.reasonForUserId_[userId];
  }

  /**
   * Check if a user is blacklisted.
   * @param {string} userId - The ID of the user to check the blacklist for.
   * @return {boolean}
   */
  async isUserBlacklisted(userId) {
    await this.ready;
    return !!this.reasonForUserId_[userId];
  }

  async updatePersistence_() {
    await this.ready;
    return this.persistence_.editData(BLACKLIST_PERSISTENCE_KEY, () => this.reasonForUserId_);
  }
}

module.exports = Blacklist;
