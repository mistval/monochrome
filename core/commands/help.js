'use strict'
const reload = require('require-reload')(require);
const ErisUtils = reload('./../util/eris_utils.js');
const PublicError = reload('./../public_error.js');
const strings = reload('./../string_factory.js').help;

function validateCommand(command) {
  let commandName = command.aliases[0];
  if (command.shortDescription && typeof command.shortDescription !== typeof '') {
    throw new Error('The shortDescription must be a string. It is not for ' + commandName);
  } else if (command.usageExample && typeof command.usageExample !== typeof '') {
    throw new Error('The usageExample must be a string. It is not for ' + commandName);
  } else if (command.longDescription && typeof command.longDescription !== typeof '') {
    throw new Error('The longDescription must be a string. It is not for ' + commandName);
  } else if (command.aliasesForHelp && (!Array.isArray(command.aliasesForHelp) || command.aliasesForHelp.length < 1)) {
    throw new Error('The aliasesForHelp must be an array. It is not for ' + commandName);
  }
}

function createTopLevelHelpTextForCommands(commands, helpCommandAlias) {
  if (commands.length === 0) {
    return;
  }
  let helpText = '```glsl\n';
  for (let command of commands) {
    helpText += createTopLevelHelpTextForCommand(command) + '\n';
  }
  helpText += `\nSay ${helpCommandAlias} [command name] to see more help for a command. Example: ${helpCommandAlias} ${commands[0].aliases[0]}\n\`\`\``;
  return helpText;
}

function createTopLevelHelpTextForCommand(command) {
  validateCommand(command);
  let aliases = command.aliasesForHelp || command.aliases;
  let firstAlias = aliases[0];
  let otherAliases = aliases.slice(1);
  let helpText = firstAlias;
  if (otherAliases.length > 0) {
    helpText += ` (aliases: ${otherAliases.join(', ')})`;
  }
  if (command.shortDescription || command.usageExample) {
    helpText += '\n    # ';
  }
  if (command.shortDescription) {
    helpText += command.shortDescription + ' ';
  }
  if (command.usageExample) {
    helpText += 'Example: ' + command.usageExample;
  }

  return helpText;
}

function findCommandWithAlias(commands, alias) {
  return commands.find(command => command.aliases.indexOf(alias) !== -1);
}

function findCloseMatchCommandForAlias(commands, alias) {
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
          console.log(newCandidateAlias);
          currentCandidateAlias = newCandidateAlias;
          currentCandidateCommand = newCandidateCommand;
        }
      }
    }
  }
  return currentCandidateCommand;
}

function indexOfAliasInList(command, list) {
  for (let alias of command.aliases) {
    let index = list.indexOf(alias);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

function compareCommandOrder(commandA, commandB, orderList) {
  return indexOfAliasInList(commandA, orderList) - indexOfAliasInList(commandB, orderList);
}

/**
* A command for reloading the command and message managers. This is a special command that the command manager has direct knowledge of.
*/
class Help {
  /**
  * @param {Array<Command>} otherCommands - The commands that should be considered to be included in the help.
  * @param {Array<String>} enabledSettingsForOtherCommands - An array of the enable setting name for each command.
  *   Must be parallel to the otherCommands array.
  * @param {Object} config - The monochrome config.
  */
  constructor(otherCommands, config) {
    this.commandAliases = config.autoGeneratedHelpCommandAliases;
    this.embedColor_ = config.colorForAutoGeneratedHelpEmbeds;
    this.uniqueId = 'autoGeneratedHelp425654';
    this.allCommands_ = otherCommands;
    this.commandsForTopLevelHelp_ = otherCommands
      .filter(command => indexOfAliasInList(command, config.commandsToGenerateHelpFor) !== -1)
      .sort((a, b) => compareCommandOrder(a, b, config.commandsToGenerateHelpFor));
    this.requiredSettings = this.commandsForTopLevelHelp_
      .map(command => command.getEnabledSettingFullyQualifiedUserFacingName())
      .filter(settingName => !!settingName);
    for (let command of this.commandsForTopLevelHelp_) {
      validateCommand(command);
    }
    this.action = (bot, msg, suffix, settings) => this.execute_(bot, msg, suffix, settings);
  }

  execute_(bot, msg, suffix, settings) {
    if (suffix) {
      return this.showAdvancedHelp_(msg, suffix, settings);
    } else {
      return this.showGeneralHelp_(msg, settings);
    }
  }

  showAdvancedHelp_(msg, targetAlias, settings) {
    let command = findCommandWithAlias(this.allCommands_, targetAlias);
    if (!command) {
      command = findCloseMatchCommandForAlias(this.allCommands_, targetAlias);
    }
    if (!command) {
      return this.showGeneralHelp_(msg, settings);
    }

    let fields = [];
    if (command.getCooldown() !== undefined) {
      fields.push({name: 'Cooldown', value: command.getCooldown().toString() + ' seconds', inline: true});
    }
    let permissionsString = '';

    if (command.getIsForServerAdminOnly()) {
      permissionsString += 'Server admin\n';
    }
    if (command.getIsForBotAdminOnly()) {
      permissionsString += 'Bot admin\n';
    }
    if (!permissionsString) {
      permissionsString += 'None';
    }
    fields.push({name: 'Required permissions', value: permissionsString, inline: true});
    if (command.usageExample) {
      fields.push({name: 'Usage example', value: command.usageExample});
    }

    let botContent = {
      embed: {
        title: command.aliases[0],
        description: command.longDescription || command.shortDescription,
        color: this.embedColor_,
        fields: fields,
      }
    };

    return msg.channel.createMessage(botContent, null, msg);
  }

  showGeneralHelp_(msg, settings) {
    let commandsToDisplayHelpFor = [];
    for (let command of this.commandsForTopLevelHelp_) {
      let enabledSettingName = command.getEnabledSettingFullyQualifiedUserFacingName();
      if (enabledSettingName && !settings[enabledSettingName]) {
        continue;
      }
      commandsToDisplayHelpFor.push(command);
    }

    let helpText = createTopLevelHelpTextForCommands(commandsToDisplayHelpFor, this.commandAliases[0]);
    if (helpText) {
      return msg.channel.createMessage(helpText, null, msg);
    } else {
      throw PublicError.createWithCustomPublicMessage('There are no commands to show help for. Perhaps the server admins disabled all my commands in this channel.', true, strings.noCommandsForHelpLog);
    }
  }
}

module.exports = Help;
