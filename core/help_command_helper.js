const HelpCommand = require('./commands/help.js');

class HelpCommandHelper {
  constructor(commands, config, settings) {
    this.config_ = config;
    this.settings_ = settings;
    this.nonHiddenCommands_ = commands.filter(command => !command.hidden);
  }

  generateHelpCommandData() {
    return new HelpCommand(this, this.config_);
  }

  getNonHiddenCommands() {
    return this.nonHiddenCommands_;
  }

  findCommandForAlias(alias) {
    const commands = this.getNonHiddenCommands();

    const exactMatch = commands.find(command => command.aliases.indexOf(alias) !== -1);
    if (exactMatch) {
      return exactMatch;
    }

    let currentCandidateCommand;
    let currentCandidateAlias;
    for (let newCandidateCommand of commands) {
      for (let newCandidateAlias of newCandidateCommand.aliases) {
        if (newCandidateAlias.indexOf(alias) !== -1) {
          let update = false;
          if (!currentCandidateCommand) {
            update = true;
          } else {
            let currentStartsWithAlias = currentCandidateAlias.startsWith(alias);
            let newStartsWithAlias = newCandidateAlias.startsWith(alias);
            let currentContainsAliasNotAtStart = !currentStartsWithAlias || currentCandidateAlias.replace(alias, '').indexOf(alias) !== -1;
            let newContainsAliasNotAtStart = !newStartsWithAlias || newCandidateAlias.replace(alias, '').indexOf(alias) !== -1;
            let newIsShorter = newCandidateAlias.length < currentCandidateAlias.length;
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
              update = newCandidateAlias.length < currentCandidateAlias.length;
            }
          }

          if (update) {
            currentCandidateAlias = newCandidateAlias;
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
    return this.nonHiddenCommands_.filter((command, i) => enabledArray[i]);
  }
}

module.exports = HelpCommandHelper;
