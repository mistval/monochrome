**Don't use me**: monochrome version 2.x.x does not work with node 12.18.x+, and monochrome 3 is in alpha and not intended for use by anyone but me at this point.

# Monochrome

A flexible Discord bot core built on [Eris](https://abal.moe/Eris/).
Node v12+ recommended.

__Key features__:
* Command framework
* Server/channel/user settings framework
* Built in on-disk persistence
* Zero-effort custom prefixes and command enabling/disabling, configurable by server admins
* Two-dimensional pagination with lazy-loading and caching
* Automatic logging of virtually all user interaction with the bot

The best way to get started is to clone the [monochrome demo](https://github.com/mistval/monochrome-demo), have a look in its commands directory to see how it works, and then delete the existing commands that you don't need and add your own. This way you do not need to create the correct directory structure from scratch. In addition, a number of the demo commands are useful and you should consider using them in your bot.

For more advanced help and API documentation, see the [full documentation](https://mistval.github.io/monochrome/Monochrome.html).

For a production bot using monochrome, see [Kotoba](http://kotobaweb.com/bot).

Version 2.0.0 contains many breaking changes. Updating from version 1.x.x will break your bot. There is no urgent need to update if you don't need any of the new features. Until you're ready to update, make sure to specify the version you need in your package.json file.

## Essential commands

Monochrome doesn't have built-in commands. Instead, essential commands are distributed in the [monochrome demo](https://github.com/mistval/monochrome-demo). They are available there instead of being built into the NPM module so that you can easily pick and choose commands and customize them as you please.

The following of the demo commands may be useful to you:
* about.js - Fill in the information that you want people to know about your bot.
* blacklist.js - Blacklist bad users and prevent them from being able to use the bot.
* unblacklist.js - Remove a user from the blacklist.
* broadcast.js - Send a message as the bot.
* delete.js - Delete a message.
* eval.js - Evaluate arbitrary Javascript code.
* help.js - Show a help command with information about the bot's commands.
* reload.js - Dynamically reload your commands, message processors, and settings without restarting the bot. Note that for all of your code to get reloaded, you must use [require-reload](https://www.npmjs.com/package/require-reload) to require your modules, instead of the regular Javascript require function.
* servers.js - Show a list of all servers that the bot is in.
* settings.js - Allow users to edit the settings that you specify in your [settings definition file](https://github.com/mistval/monochrome-demo/blob/master/server_settings.js), plus command prefixes and command enable/disabled state.
* shutdown.js - Disconnect from Discord and kill the process.

## Help

Feel free to visit [my Discord server](https://discordapp.com/invite/zkAKbyJ) for support.
