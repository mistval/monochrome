'use strict'
const reload = require('require-reload')(require);
const ErisUtils = reload('./../util/eris_utils.js');
const PublicError = reload('./../public_error.js');
const strings = reload('./../string_factory.js').help;
const constants = reload('./../constants.js');

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

function prefixAliases(aliases, prefix) {
  return aliases.map(alias => `${prefix}${alias}`);
}

function createTopLevelHelpTextForCommand(command, prefix) {
  validateCommand(command);
  let aliases = command.aliasesForHelp || command.aliases;
  let prefixedAliases = prefixAliases(aliases, prefix);
  let firstPrefixedAlias = prefixedAliases[0];
  let otherPrefixedAliases = prefixedAliases.slice(1);
  let helpText = firstPrefixedAlias;
  if (otherPrefixedAliases.length > 0) {
    helpText += ` (aliases: ${otherPrefixedAliases.join(', ')})`;
  }
  if (command.shortDescription || command.usageExample) {
    helpText += '\n    # ';
  }
  if (command.shortDescription) {
    helpText += command.shortDescription + ' ';
  }
  if (command.usageExample) {
    helpText += 'Example: ' + command.usageExample.replace(constants.PREFIX_REPLACE_REGEX, prefix);
  }

  return helpText;
}

function createTopLevelHelpTextForCommands(commands, helpCommandAlias, prefix) {
  if (commands.length === 0) {
    return;
  }
  let helpText = '```glsl\n';
  for (let command of commands) {
    helpText += createTopLevelHelpTextForCommand(command, prefix) + '\n';
  }
  helpText += `\nSay ${prefix}${helpCommandAlias} [command name] to see more help for a command. Example: ${prefix}${helpCommandAlias} ${commands[0].aliases[0]}\n\`\`\``;
  return helpText;
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

function getCommandsForTopLevelHelpInOrder(nonHiddenCommands, generationOrder) {
  return nonHiddenCommands
    .filter(command => indexOfAliasInList(command, generationOrder) !== -1)
    .sort((a, b) => compareCommandOrder(a, b, generationOrder));
}

class Help {
  constructor(helpCommandHelper, config) {
    this.commandAliases = config.autoGeneratedHelpCommandAliases;
    this.embedColor_ = config.colorForAutoGeneratedHelpEmbeds;
    this.commandGenerationOrder_ = config.commandsToGenerateHelpFor;
    this.uniqueId = 'autoGeneratedHelp425654';

    const commandsForTopLevelHelp = getCommandsForTopLevelHelpInOrder(
      helpCommandHelper.getNonHiddenCommands(),
      this.commandGenerationOrder_,
    );

    for (let command of commandsForTopLevelHelp) {
      validateCommand(command);
    }

    this.action = (erisBot, msg, suffix, monochromeBot) => this.execute_(erisBot, msg, suffix, monochromeBot);
  }

  execute_(erisBot, msg, suffix, monochromeBot) {
    const helpCommandHelper = monochromeBot.getCommandManager().getHelpCommandHelper();
    const persistence = monochromeBot.getPersistence();
    const prefix = persistence.getPrefixesForServerId(msg.channel.guild ? msg.channel.guild.id : msg.channel.id)[0];
    if (suffix) {
      return this.showAdvancedHelp_(msg, suffix, helpCommandHelper, prefix);
    } else {
      return this.showGeneralHelp_(msg, helpCommandHelper, prefix);
    }
  }

  showAdvancedHelp_(msg, targetAlias, helpCommandHelper, prefix) {
    const command = helpCommandHelper.findCommandForAlias(targetAlias, msg.channel.guild ? msg.channel.guild.id : msg.channel.id);
    if (!command) {
      return this.showGeneralHelp_(msg, helpCommandHelper, prefix);
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
      fields.push({name: 'Usage example', value: command.usageExample.replace(prefixReplaceRegex, prefix)});
    }

    let botContent = {
      embed: {
        title: `${prefix}${command.aliases[0]}`,
        description: command.longDescription || command.shortDescription,
        color: this.embedColor_,
        fields: fields,
      }
    };

    return msg.channel.createMessage(botContent, null, msg);
  }

  async showGeneralHelp_(msg, helpCommandHelper, prefix) {
    const enabledNonHiddenCommands = await helpCommandHelper.getEnabledNonHiddenCommands(msg);
    const commandsToDisplayHelpFor = getCommandsForTopLevelHelpInOrder(
      enabledNonHiddenCommands,
      this.commandGenerationOrder_,
    );

    let helpText = createTopLevelHelpTextForCommands(commandsToDisplayHelpFor, this.commandAliases[0], prefix);
    if (helpText) {
      return msg.channel.createMessage(helpText, null, msg);
    } else {
      throw PublicError.createWithCustomPublicMessage('There are no commands to show help for. Perhaps the server admins disabled all my commands in this channel.', true, strings.noCommandsForHelpLog);
    }
  }
}

module.exports = Help;
