const request = require('request-promise');

const LOGGER_TITLE = 'STATS';
const UPDATE_STATS_INTERVAL_IN_MS = 7200000; // 2 hours
const UPDATE_STATS_INITIAL_DELAY_IN_MS = 60000; // 1 minute

class TrackerStatsUpdater {
  constructor(
    bot,
    logger,
    discordBotsDotOrgAPIKey,
    discordDotBotsDotGgAPIKey,
    botsOnDiscordDotXyzAPIKey,
  ) {
    this.bot = bot;
    this.logger = logger;
    this.discordBotsDotOrgAPIKey = discordBotsDotOrgAPIKey;
    this.discordDotBotsDotGgAPIKey = discordDotBotsDotGgAPIKey;
    this.botsOnDiscordDotXyzAPIKey = botsOnDiscordDotXyzAPIKey;
  }

  updateBotsOnDiscordDotXyz() {
    if (!this.botsOnDiscordDotXyzAPIKey) {
      return;
    }
  
    const payload = {
      guildCount: this.bot.guilds.size,
    };
  
    request({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.botsOnDiscordDotXyzAPIKey,
        'Accept': 'application/json',
      },
      uri: `https://bots.ondiscord.xyz/bot-api/bots/${this.bot.user.id}/guilds`,
      body: JSON.stringify(payload),
      method: 'POST',
    }).then(() => {
      this.logger.logSuccess(LOGGER_TITLE, `Sent stats to bots.ondiscord.xyz: ${payload.guildCount} servers.`);
    }).catch(err => {
      this.logger.logFailure(LOGGER_TITLE, 'Error sending stats to bots.ondiscord.xyz', err);
    });
  }

  updateDiscordBotsDotOrg() {
    if (!this.discordBotsDotOrgAPIKey) {
      return;
    }
  
    const payload = {
      server_count: this.bot.guilds.size,
      shard_count: this.bot.shards.size,
    };
  
    request({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.discordBotsDotOrgAPIKey,
        'Accept': 'application/json',
      },
      uri: `https://discordbots.org/api/bots/${this.bot.user.id}/stats`,
      body: JSON.stringify(payload),
      method: 'POST',
    }).then(() => {
      this.logger.logSuccess(LOGGER_TITLE, `Sent stats to discordbots.org: ${payload.server_count} servers and ${payload.shard_count} shards.`);
    }).catch(err => {
      this.logger.logFailure(LOGGER_TITLE, 'Error sending stats to discordbots.org', err);
    });
  }

  updateDiscordDotBotsDotGg() {
    if (!this.discordDotBotsDotGgAPIKey) {
      return;
    }
  
    const payload = {
      guildCount: this.bot.guilds.size,
      shardCount: this.bot.shards.size,
    };
  
    request({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.discordDotBotsDotGgAPIKey,
        'Accept': 'application/json',
      },
      uri: `https://discord.bots.gg/api/v1/bots/${this.bot.user.id}/stats`,
      body: JSON.stringify(payload),
      method: 'POST',
    }).then(() => {
      this.logger.logSuccess(LOGGER_TITLE, `Sent stats to discord.bots.gg: ${payload.guildCount} servers and ${payload.shardCount} shards.`);
    }).catch(err => {
      this.logger.logFailure(LOGGER_TITLE, 'Error sending stats to discord.bots.gg', err);
    });
  }

  hasApiKey() {
    return Object.getOwnPropertyNames(this)
      .some(propertyName => propertyName.endsWith('APIKey') && this[propertyName]);
  }

  updateStats() {
    try {
      this.updateDiscordDotBotsDotGg();
      this.updateDiscordBotsDotOrg();
      this.updateBotsOnDiscordDotXyz();
    } catch (err) {
      this.logger.logFailure(LOGGER_TITLE, 'Failed to send stats to bot trackers.', err);
    }
  }

  startUpdateLoop() {
    if (this.updateStatsTimeoutHandle_ || !this.hasApiKey()) {
      return;
    }

    this.updateStatsTimeoutHandle_ = setTimeout(() => {
      this.updateStats();
      this.updateStatsTimeoutHandle_ = setInterval(() => this.updateStats(), UPDATE_STATS_INTERVAL_IN_MS);
    }, UPDATE_STATS_INITIAL_DELAY_IN_MS);
  }
}

module.exports = TrackerStatsUpdater;