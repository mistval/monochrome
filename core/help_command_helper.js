class HelpCommandHelper {
  constructor(commands, config, settings, persistence) {
    this.config_ = config;
    this.settings_ = settings;
    this.persistence_ = persistence;
    this.nonHiddenCommands_ = commands.filter(command => !command.hidden);
  }

  getNonHiddenCommands() {
    return this.nonHiddenCommands_;
  }

  findCommandForAlias(alias, serverId) {
    const prefix = this.persistence_.getPrefixesForServerId(serverId)[0];
    const commands = this.getNonHiddenCommands();

    const exactMatch =
      commands.find(command => command.aliases.indexOf(alias) !== -1)
      || commands.find(command => command.aliases.indexOf(`${prefix}${alias}`) !== -1);

    if (exactMatch) {
      return exactMatch;
    }

    let currentCandidateCommand;
    let currentCandidateAlias;
    let prefixedCurrentCandidateAlias = '';
    for (let newCandidateCommand of commands) {
      for (let newCandidateAlias of newCandidateCommand.aliases) {
        const prefixedNewCandidateAlias = `${prefix}${newCandidateAlias}`;
        if (prefixedNewCandidateAlias.indexOf(alias) !== -1) {
          let update = false;
          if (!currentCandidateCommand) {
            update = true;
          } else {
            let currentStartsWithAlias = prefixedCurrentCandidateAlias.startsWith(alias);
            let newStartsWithAlias = prefixedNewCandidateAlias.startsWith(alias);
            let currentContainsAliasNotAtStart = !currentStartsWithAlias || prefixedCurrentCandidateAlias.replace(alias, '').indexOf(alias) !== -1;
            let newContainsAliasNotAtStart = !newStartsWithAlias || prefixedNewCandidateAlias.replace(alias, '').indexOf(alias) !== -1;
            let newIsShorter = prefixedNewCandidateAlias.length < prefixedCurrentCandidateAlias.length;
            if (currentStartsWithAlias && newStartsWithAlias) {
              // They both start with the alias.
              if (currentContainsAliasNotAtStart && newContainsAliasNotAtStart) {
                // They both start with the alias and contain the alias not at start. Update if new is shorter.
                update = newIsShorter;
              } else if (newContainsAliasNotAtStart) {
                // They both start with the alias, only the new one of them contains the alias not at start. Update.
                update = true;
              } else {
                // They both start with the alias, only the old one of them contains the alias not at start. Don't update.
              }
            } else if (currentStartsWithAlias || newStartsWithAlias) {
              // One of them starts with the alias, the other does not. Update if it's the old one.
              update = currentStartsWithAlias;
            } else {
              // They both contain the alias, but not at the start. Update if new is shorter.
              update = prefixedNewCandidateAlias.length < prefixedCurrentCandidateAlias.length;
            }
          }

          if (update) {
            prefixedCurrentCandidateAlias = prefixedNewCandidateAlias;
            currentCandidateCommand = newCandidateCommand;
          }
        }
      }
    }
    return currentCandidateCommand;
  }

  async getEnabledNonHiddenCommands(msg) {
    const promises = this.nonHiddenCommands_.map(command => {
      return this.settings_.getInternalSettingValue(
        command.getEnabledSettingUniqueId(),
        msg.channel.guild ? msg.channel.guild.id : msg.channel.id,
        msg.channel.id,
        msg.author.id,
      );
    });

    const enabledArray = await Promise.all(promises);
    return this.nonHiddenCommands_.filter((command, i) => enabledArray[i] === true || enabledArray[i] === undefined);
  }
}

module.exports = HelpCommandHelper;
