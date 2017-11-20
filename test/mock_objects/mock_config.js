class MockConfig {
  constructor(serverAdminRole, botAdminIds, helpCommandAliases, commandsToGenerateHelpFor) {
    this.botAdminIds = botAdminIds;
    this.serverAdminRoleName = serverAdminRole;
    this.genericErrorMessage = 'Error';
    this.settingsCategorySeparator = '/';
    this.commandsToGenerateHelpFor = commandsToGenerateHelpFor || [];
    this.autoGeneratedHelpCommandAliases = helpCommandAliases || [];
    this.serverSettingsCommandAliases = [']settings'];
  }
}

module.exports = MockConfig;
