const reload = require('require-reload')(require);
const assert = require('assert');
const Hook = reload('./../message_processors/user_and_channel_hook.js');

const CATEGORY_DESCRIPTION = 'The following subcategories and settings are available. Type the number of the one you want to see/change.';
const HOOK_EXPIRATION_MS = 180000;

function isCategory(settingsTreeNode) {
  return !!settingsTreeNode.children;
}

function createFieldsForChildren(children) {
  const categories = [];
  const settings = [];

  for (const child of children) {
    if (isCategory(child)) {
      categories.push(child);
    } else {
      settings.push(child);
    }
  }

  let optionNumber = 0;

  const categoriesString = categories.map(category => {
    optionNumber += 1;
    return `${optionNumber}. ${category.userFacingName}`;
  }).join('\n');

  const settingsString = settings.map(setting => {
    optionNumber += 1;
    const adminOnlyString = setting.serverOnly ? ' (*admin only*)' : '';
    return `${optionNumber}. ${setting.userFacingName}${adminOnlyString}`;
  }).join('\n');

  const fields = [];
  if (categoriesString) {
    fields.push({ name: 'Subcategories', value: categoriesString });
  }
  if (settingsString) {
    fields.push({ name: 'Settings', value: settingsString });
  }

  return fields;
}

function createContentForRoot(children, color) {
  return {
    embed: {
      title: 'Settings',
      description: CATEGORY_DESCRIPTION,
      fields: createFieldsForChildren(children),
      color: color,
    },
  };
}

function createContentForCategory(category, color) {
  return {
    embed: {
      title: `Settings (${category.userFacingName})`,
      description: CATEGORY_DESCRIPTION,
      fields: createFieldsForChildren(category.children),
      color: color,
    },
  };
}

async function createContentForSetting(msg, settings, setting, color) {
  return {
    embed: {
      title: `Settings (${setting.userFacingName})`,
      description: setting.description,
      color: color,
      fields: [
        {
          name: 'Allowed values',
          value: setting.allowedValuesDescription,
        },
        {
          name: 'Can be changed by',
          value: setting.serverOnly ? 'Server admin' : 'Anyone',
        },
        {
          name: 'Current value',
          value: await settings.getUserFacingSettingValue(
            setting.uniqueId,
            msg.channel.guild ? msg.channel.guild.id : msg.channel.id,
            msg.channel.id,
            msg.author.id,
          ),
        }
      ],
      footer: {
        text: 'To change the value, type in the new value. Or say \'back\' or \'cancel\'.',
      },
    },
  };
}

function messageToIndex(msg) {
  const msgAsInt = parseInt(msg.content);
  return msgAsInt - 1;
}

function handleExpiration(msg) {
  return msg.channel.createMessage('The settings menu has closed due to inactivity.');
}

function findParent(children, targetNode, previous) {
  if (!children) {
    return undefined;
  }

  for (const child of children) {
    if (child === targetNode) {
      return previous;
    }
    const childResult = findParent(child.children, targetNode, child);
    if (childResult) {
      return childResult;
    }
  }

  return undefined;
}

function tryGoBack(hook, msg, monochrome, settingsNode, color, userIsServerAdmin) {
  const root = monochrome.getSettings().getRawSettingsTree();
  if (msg.content.toLowerCase() === 'back') {
    const parent = findParent(monochrome.getSettings().getRawSettingsTree(), settingsNode, root);
    if (parent) {
      hook.unregister();
      return showNode(monochrome, msg, color, parent, userIsServerAdmin);
    }
  }

  return false;
}

function tryCancel(hook, msg) {
  if (msg.content.toLowerCase() === 'cancel') {
    hook.unregister();
    return msg.channel.createMessage('The settings menu has been closed.');
  }

  return false;
}

function handleRootViewMsg(hook, monochrome, msg, color, userIsServerAdmin) {
  const index = messageToIndex(msg);
  const settingsNodes = monochrome.getSettings().getRawSettingsTree();
  if (index < settingsNodes.length) {
    const nextNode = settingsNodes[index];
    hook.unregister();
    return showNode(monochrome, msg, color, nextNode, userIsServerAdmin);
  }

  return tryCancel(hook, msg);
}

async function tryApplyNewSetting(hook, monochrome, msg, color, userIsServerAdmin, setting, newUserFacingValue, locationString) {
  const settings = monochrome.getSettings();

  const cancelBackResult = tryHandleCancelBack(hook, monochrome, msg, color, setting, userIsServerAdmin);
  if (cancelBackResult) {
    return cancelBackResult;
  }

  const serverId = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
  const locationStringLowerCase = locationString.toLowerCase();
  let setResults;
  let resultString;

  if (locationStringLowerCase === 'me') {
    resultString = 'The new setting has been applied as a user setting. It will take effect whenever you use the command.';
    if (setting.serverOnly) {
      return msg.channel.createMessage('That setting cannot be set as a user setting. Please say **this channel**, **this server**, **cancel**, **back**, or provide a list of channels.');
    }
    setResults = [await settings.setUserSettingValue(setting.uniqueId, msg.author.id, newUserFacingValue)];
  } else if (locationStringLowerCase === 'this channel' || !msg.channel.guild) {
    resultString = 'The new setting has been applied to this channel.';
    setResults = [await settings.setChannelSettingValue(setting.uniqueId, serverId, msg.channel.id, newUserFacingValue, userIsServerAdmin)];
  } else if (locationStringLowerCase === 'this server') {
    resultString = 'The new setting has been applied to all channels in this server.';
    setResults = [await settings.setServerWideSettingValue(setting.uniqueId, serverId, newUserFacingValue, userIsServerAdmin)];
  } else {
    resultString = `The new setting has been applied to the channels: ${locationString}`;
    const regex = /<#(.*?)>/g;
    const channelIds = [];

    let regexResult;
    while (regexResult = regex.exec(locationString)) {
      const channelId = regexResult[1];
      if (!msg.channel.guild.channels.find(channel => channel.id === channelId)) {
        return msg.channel.createMessage(`I didn\'t find a channel in this server called **${regexResult[0]}**. Please check that the channel exists and try again.`);
      }
      channelIds.push(channelId);
    }

    const promises = [];
    for (const channelId of channelIds) {
      promises.push(settings.setChannelSettingValue(setting.uniqueId, serverId, channelId, newUserFacingValue, userIsServerAdmin));
    }

    setResults = await Promise.all(promises);
  }

  hook.unregister();

  for (const result of setResults) {
    if (!result.accepted) {
      monochrome.getLogger().logFailure('SETTINGS', `Unexpected setting update rejection. Reason: ${result.reason}`);
      return msg.channel.createMessage('There was an error updating that setting. Sorry. I\'ll look into it!');
    }
  }

  return msg.channel.createMessage(resultString);
}

function tryPromptForSettingLocation(hook, msg, monochrome, settingNode, color, userIsServerAdmin, newUserFacingValue) {
  if (!userIsServerAdmin) {
    if (setting.serverOnly) {
      return msg.channel.createMessage('Only a server admin can set that setting. You can say **back** or **cancel**.');
    } else {
      return tryApplyNewSetting(hook, monochrome, msg, color, userIsServerAdmin, setting, newUserFacingValue, 'me');
    }
  }

  if (hook) {
    hook.unregister();
  }

  hook = Hook.registerHook(
    msg.author.id,
    msg.channel.id,
    (cbHook, cbMsg, monochrome) => tryApplyNewSetting(
      cbHook,
      monochrome,
      cbMsg,
      color,
      userIsServerAdmin,
      settingNode,
      newUserFacingValue,
      cbMsg.content,
    ),
    monochrome.getLogger(),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));
  if (settingNode.serverOnly) {
    return msg.channel.createMessage('Where should the new setting be applied? You can say **this server**, **this channel**, or list channels, for example: **#general #bot #quiz**. You can also say **cancel** or **back**.');
  } else {
    return msg.channel.createMessage('Where should the new setting be applied? You can say **me**, **this server**, **this channel**, or list channels, for example: **#general #bot #quiz**. You can also say **cancel** or **back**.');
  }
}

async function handleSettingViewMsg(hook, monochrome, msg, color, setting, userIsServerAdmin) {
  assert(typeof userIsServerAdmin === 'boolean', 'userIsServerAdmin is not boolean');

  const cancelBackResult = tryHandleCancelBack(hook, monochrome, msg, color, setting, userIsServerAdmin);
  if (cancelBackResult) {
    return cancelBackResult;
  }

  const settings = monochrome.getSettings();
  const newUserFacingValue = msg.content;

  const isValid = await settings.userFacingValueIsValidForSetting(setting, newUserFacingValue);
  if (!isValid) {
    return msg.channel.createMessage('That isn\'t a valid value for that setting. Please check the **Allowed values** and try again. You can also say **back** or **cancel**.');
  }

  return tryPromptForSettingLocation(hook, msg, monochrome, setting, color, userIsServerAdmin, newUserFacingValue);
}

function tryHandleCancelBack(hook, monochrome, msg, color, node, userIsServerAdmin) {
  const cancelResult = tryCancel(hook, msg);
  if (cancelResult) {
    return cancelResult;
  }

  return tryGoBack(
    hook,
    msg,
    monochrome,
    node,
    color,
    userIsServerAdmin,
  );
}

function handleCategoryViewMsg(hook, monochrome, msg, color, category, userIsServerAdmin) {
  const index = messageToIndex(msg);
  const childNodes = category.children;
  if (index < childNodes.length) {
    const nextNode = childNodes[index];
    hook.unregister();
    return showNode(monochrome, msg, color, nextNode, userIsServerAdmin);
  }

  return tryHandleCancelBack(hook, monochrome, msg, color, category, userIsServerAdmin);
}

function showRoot(monochrome, msg, color, userIsServerAdmin) {
  const rootContent = createContentForRoot(monochrome.getSettings().getRawSettingsTree(), color);
  const hook = Hook.registerHook(
    msg.author.id,
    msg.channel.id,
    (cbHook, cbMsg, monochrome) => handleRootViewMsg(
      cbHook,
      monochrome,
      cbMsg,
      color,
      userIsServerAdmin,
    ),
    monochrome.getLogger(),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));
  return msg.channel.createMessage(rootContent);
}

function showCategory(monochrome, msg, color, category, userIsServerAdmin) {
  const categoryContent = createContentForCategory(category, color);
  const hook = Hook.registerHook(
    msg.author.id, msg.channel.id,
    (cbHook, cbMsg, monochrome) => handleCategoryViewMsg(
      cbHook,
      monochrome,
      cbMsg,
      color,
      category,
      userIsServerAdmin,
    ),
    monochrome.getLogger(),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));
  return msg.channel.createMessage(categoryContent);
}

async function showSetting(monochrome, msg, color, setting, userIsServerAdmin) {
  const settingContent = await createContentForSetting(msg, monochrome.getSettings(), setting, color);
  const hook = Hook.registerHook(
    msg.author.id, msg.channel.id,
    (cbHook, cbMsg, monochrome) => handleSettingViewMsg(
      cbHook,
      monochrome,
      cbMsg,
      color,
      setting,
      userIsServerAdmin,
    ),
    monochrome.getLogger(),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, () => handleExpiration(msg));
  return msg.channel.createMessage(settingContent);
}

function showNode(monochrome, msg, color, node, userIsServerAdmin) {
  if (Array.isArray(node)) {
    return showRoot(monochrome, msg, color, userIsServerAdmin);
  } else if (node.children) {
    return showCategory(monochrome, msg, color, node, userIsServerAdmin);
  } else {
    return showSetting(monochrome, msg, color, node, userIsServerAdmin);
  }
}

function shortcut(monochrome, msg, suffix, color) {
  const settings = monochrome.getSettings();
  const [uniqueId, value] = suffix.split(' ');
  const setting = settings.getTreeNodeForUniqueId(uniqueId);

  if (!setting) {
    return msg.channel.createMessage(`I didn't find a setting with ID: ${uniqueId}`);
  }
  if (!value) {
    return showNode(monochrome, msg, color, setting, msg.authorIsServerAdmin);
  }

  return tryPromptForSettingLocation(undefined, msg, monochrome, setting, color, msg.authorIsServerAdmin, value);
}

function execute(monochrome, msg, suffix, color) {
  if (suffix) {
    return shortcut(monochrome, msg, suffix, color);
  } else {
    return showNode(monochrome, msg, color, monochrome.getSettings().getRawSettingsTree(), msg.authorIsServerAdmin);
  }
}

class SettingsCommand {
  constructor(config) {
    this.commandAliases = config.settingsCommandAliases;
    this.uniqueId = 'autoGeneratedSettings425654';
    this.canBeChannelRestricted = false;
    this.attachIsServerAdmin = true;

    this.action = (erisBot, monochrome, msg, suffix) => execute(
      monochrome,
      msg,
      suffix,
      config.colorForSettingsSystemEmbeds,
    );
  }
}

module.exports = SettingsCommand;
