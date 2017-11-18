class MockConfig {
  constructor(serverAdminRole, botAdminIds) {
    this.botAdminIds = botAdminIds;
    this.serverAdminRoleName = serverAdminRole;
    this.genericErrorMessage = 'Error';
    this.settingsCategorySeparator = '/';
  }
}

module.exports = MockConfig;
