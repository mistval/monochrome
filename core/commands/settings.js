const Hook = require('./../message_processors/user_and_channel_hook.js');

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
  return msg.channel.createMessage('The settings menu has closed due to inactivity');
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

function tryGoBack(hook, msg, monochrome, settingsNode, color, root) {
  if (msg.content.toLowerCase() === 'back') {
    const parent = findParent(monochrome.getSettings().getRawSettingsTree(), settingsNode, root);
    if (parent) {
      hook.unregister();
      return showNode(monochrome, msg, color, parent);
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

function handleRootViewMsg(hook, monochrome, msg, color) {
  const index = messageToIndex(msg);
  const settingsNodes = monochrome.getSettings().getRawSettingsTree();
  if (index < settingsNodes.length) {
    const nextNode = settingsNodes[index];
    hook.unregister();
    return showNode(monochrome, msg, color, nextNode);
  }

  return tryCancel(hook, msg);
}

function handleSettingViewMsg(hook, monochrome, msg, color, setting) {
  const cancelResult = tryCancel(hook, msg);
  if (cancelResult) {
    return cancelResult;
  }

  return tryGoBack(hook, msg, monochrome, setting, color, monochrome.getSettings().getRawSettingsTree());
}

function handleCategoryViewMsg(hook, monochrome, msg, color, category) {
  const index = messageToIndex(msg);
  const childNodes = category.children;
  if (index < childNodes.length) {
    const nextNode = childNodes[index];
    hook.unregister();
    return showNode(monochrome, msg, color, nextNode);
  }

  const cancelResult = tryCancel(hook, msg);
  if (cancelResult) {
    return cancelResult;
  }

  return tryGoBack(hook, msg, monochrome, category, color, monochrome.getSettings().getRawSettingsTree());
}

function showRoot(monochrome, msg, color) {
  const rootContent = createContentForRoot(monochrome.getSettings().getRawSettingsTree(), color);
  const hook = Hook.registerHook(
    msg.author.id,
    msg.channel.id,
    (cbHook, cbMsg, monochrome) => handleRootViewMsg(
      cbHook,
      monochrome,
      cbMsg,
      color,
    )
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, (cbHook, cbMsg, monochrome) => handleRootViewMsg(cbHook, cbMsg, monochrome, color));
  return msg.channel.createMessage(rootContent);
}

function showCategory(monochrome, msg, color, category) {
  const categoryContent = createContentForCategory(category, color);
  const hook = Hook.registerHook(
    msg.author.id, msg.channel.id,
    (cbHook, cbMsg, monochrome) => handleCategoryViewMsg(
      cbHook,
      monochrome,
      cbMsg,
      color,
      category,
    ),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, (cbHook, cbMsg, monochrome) => h(cbHook, cbMsg, monochrome, color));
  return msg.channel.createMessage(categoryContent);
}

async function showSetting(monochrome, msg, color, setting) {
  const settingContent = await createContentForSetting(msg, monochrome.getSettings(), setting, color);
  const hook = Hook.registerHook(
    msg.author.id, msg.channel.id,
    (cbHook, cbMsg, monochrome) => handleSettingViewMsg(
      cbHook,
      monochrome,
      cbMsg,
      color,
      setting,
    ),
  );

  hook.setExpirationInMs(HOOK_EXPIRATION_MS, (cbHook, cbMsg, monochrome) => h(cbHook, cbMsg, monochrome, color));
  return msg.channel.createMessage(settingContent);
}

function showNode(monochrome, msg, color, node) {
  if (Array.isArray(node)) {
    return showRoot(monochrome, msg, color);
  } else if (node.children) {
    return showCategory(monochrome, msg, color, node);
  } else {
    return showSetting(monochrome, msg, color, node);
  }
}

function execute(monochrome, msg, suffix, color) {
  return showNode(monochrome, msg, color, monochrome.getSettings().getRawSettingsTree());
}

class SettingsCommand {
  constructor(config) {
    this.commandAliases = config.settingsCommandAliases;
    this.uniqueId = 'autoGeneratedSettings425654';
    this.canBeChannelRestricted = false;

    this.action = (erisBot, monochrome, msg, suffix) => execute(
      monochrome,
      msg,
      suffix,
      config.colorForSettingsSystemEmbeds,
    );
  }
}

module.exports = SettingsCommand;
