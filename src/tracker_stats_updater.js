const axios = require('axios');

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
    this.logger = logger.child({
      component: 'Monochrome::StatsReporter',
    });

    this.discordBotsDotOrgAPIKey = discordBotsDotOrgAPIKey;
    this.discordDotBotsDotGgAPIKey = discordDotBotsDotGgAPIKey;
    this.botsOnDiscordDotXyzAPIKey = botsOnDiscordDotXyzAPIKey;
  }

  async updateBotsOnDiscordDotXyz() {
    if (!this.botsOnDiscordDotXyzAPIKey) {
      return;
    }

    const payload = {
      guildCount: this.bot.guilds.size,
    };

    try {
      await axios({
        method: 'POST',
        url: `https://bots.ondiscord.xyz/bot-api/bots/${this.bot.user.id}/guilds`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.botsOnDiscordDotXyzAPIKey,
          'Accept': 'application/json',
        },
        data: payload,
      });

      this.logger.info({
        event: 'SENT STATS TO BOTS.ONDISCORD.XYZ',
        guildCount: payload.guildCount,
      });
    } catch (err) {
      this.logger.warn({
        event: 'ERROR SENDING STATS TO BOTS.ONDISCORD.XYZ',
        err,
      });
    }
  }

  async updateDiscordBotsDotOrg() {
    if (!this.discordBotsDotOrgAPIKey) {
      return;
    }

    const payload = {
      server_count: this.bot.guilds.size,
      shard_count: this.bot.shards.size,
    };

    try {
      await axios({
        method: 'POST',
        url: `https://discordbots.org/api/bots/${this.bot.user.id}/stats`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.discordBotsDotOrgAPIKey,
          'Accept': 'application/json',
        },
        data: payload,
      });

      this.logger.info({
        event: 'SENT STATS TO DISCORDBOTS.ORG',
        guildCount: payload.server_count,
        shardCount: payload.shard_count,
      });
    } catch (err) {
      this.logger.warn({
        event: 'ERROR SENDING STATS TO DISCORDBOTS.ORG',
        err,
      });
    }
  }

  async updateDiscordDotBotsDotGg() {
    if (!this.discordDotBotsDotGgAPIKey) {
      return;
    }

    const payload = {
      guildCount: this.bot.guilds.size,
      shardCount: this.bot.shards.size,
    };

    try {
      await axios({
        method: 'POST',
        url: `https://discord.bots.gg/api/v1/bots/${this.bot.user.id}/stats`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.discordDotBotsDotGgAPIKey,
          'Accept': 'application/json',
        },
        data: payload,
      });

      this.logger.info({
        event: 'SENT STATS TO BOTS.DISCORD.GG',
        guildCount: payload.guildCount,
        shardCount: payload.shardCount,
      });
    } catch (err) {
      this.logger.warn({
        event: 'ERROR SENDING STATS TO BOTS.DISCORD.GG',
        err,
      });
    }
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
      this.logger.warn({
        event: 'ERROR SENDING STATS',
        err,
      });
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
