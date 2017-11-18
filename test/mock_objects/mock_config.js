class MockConfig {
  constructor(serverAdminRole, botAdminIds) {
    this.botAdminIds = botAdminIds;
    this.serverAdminRoleName = serverAdminRole;
    this.genericErrorMessage = 'Error';
    this.settingsCategorySeparator = '/';
    this.commandsToGenerateHelpFor = [];
  }
}

module.exports = MockConfig;
