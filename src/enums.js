const discordApiStringForPermission = {
  createInstantInvite: 'createInstantInvite',
  kickMembers: 'kickMembers',
  banMembers: 'banMembers',
  administrator: 'administrator',
  manageChannels: 'manageChannels',
  manageGuild: 'manageGuild',
  addReactions: 'addReactions',
  viewChannel: 'viewChannel',
  sendMessages: 'sendMessages',
  sendTTSMessages: 'sendTTSMessages',
  manageMessages: 'manageMessages',
  embedLinks: 'embedLinks',
  attachFiles: 'attachFiles',
  readMessageHistory: 'readMessageHistory',
  mentionEveryone: 'mentionEveryone',
  externalEmojis: 'externalEmojis',
  changeNickname: 'changeNickname',
  manageRoles: 'manageRoles',
  manageWebhooks: 'manageWebhooks',
  manageEmojis: 'manageEmojis',
  all: 'All',
  allGuild: 'All Guild',
  allText: 'All Text',
};

const userStringForPermission = {
  createInstantInvite: 'Create Instant Invite',
  kickMembers: 'Kick Members',
  banMembers: 'Ban Members',
  administrator: 'Administrator',
  manageChannels: 'Manage Channels',
  manageGuild: 'Manage Guild',
  addReactions: 'Add Reactions',
  viewChannel: 'View Channel',
  sendMessages: 'Send Messages',
  sendTTSMessages: 'Send TTS Messages',
  manageMessages: 'Manage Messages',
  embedLinks: 'Embed Links',
  attachFiles: 'Attach Files',
  readMessageHistory: 'Read Message History',
  mentionEveryone: 'Mention Everyone',
  externalEmojis: 'Use External Emojis',
  changeNickname: 'Change Nickname',
  manageRoles: 'Manage Roles',
  manageWebhooks: 'Manage Webhooks',
  manageEmojis: 'Manage Emojis',
};

const applicationContexts = {
  GUILD:           0,
  BOT_DM:          1,
  PRIVATE_CHANNEL: 2,
}

const integrationTypes = {
  GUILD_INSTALL: 0,
  USER_INSTALL: 1,
}

module.exports = {
  discordApiStringForPermission,
  userStringForPermission,
  applicationContexts,
  integrationTypes,
};
