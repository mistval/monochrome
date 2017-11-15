# monochrome
A flexible Discord bot core.
Node 6.9.1+ recommended.
## Basics
### Installation
```
git clone https://github.com/mistval/monochrome.git
cd monochrome
npm install -S --no-optional
```
### Configuration
<ol>
<li>Create an application in <a href='https://discordapp.com/developers/applications/me'>Discord applications</a>. (or use an existing bot token)</li>
<li>In your application's settings, click "Create a Bot User" and confirm.
<li>Enter your new bot's Token into monochrome/config.json's botToken field.</li>
<li>Use your application's Client ID to add your bot to your server. Substitute the Client ID into this link: https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot</li>
</ol>

### Starting the bot
```
node monochrome/monochrome.js
```
Your bot should now appear as online in your server. Try bot!help to get a response, and see the demo commands.
### Adding commands
Here is a simple hello world command:
```js
module.exports = {
  commandAliases: ['bot!hello', 'bot!hi'], // Aliases for the command
  uniqueId: 'hello4859', // Can be anything, as long as it's unique, and you shouldn't change it.
  action(bot, msg, suffix) {
    return bot.createMessage(msg.channel.id, 'Hello World!');
  },
};
```
Save that as helloworld.js and drop it into the monochrome/commands directory. Start your bot and say bot!hello or bot!hi to get a response. (If your bot is already running, you can use the }reload command to reload commands).
### Making it yours
The demo version of monochrome comes with demo commands, message processors, settings, and configuration. While some of these are useful, such as the set avatar command, others are not, and you will wish to delete them. To make the bot yours, you should:

<ol>
<li>Delete unwanted commands from monochrome/commands. Simply delete the files for the commands you don't want.</li>
<li>Delete unwanted message processors from monochrome/message_processors. Simply delete the files for the message processors you don't want.</li>
<li>Delete the settings in monochrome/server_settings.js. You can leave the file empty, but you should not delete it.</li>
<li>Write code for your own commands and add them to monochrome/commands.</li>
<li>Write code for your own message processors and add them to monochrome/message_processors.</li>
<li>Add your own settings hierarchy to monochrome/server_settings.js.</li>
<li>Update monochrome/config.json with your desired configuration.</li>
</ol>

## Advanced
Here is a full explanation of the fields in monochrome/config.json:
```json
{
  "botToken": "", // Your bot's token from https://discordapp.com/developers/applications/me
  "botAdminIds": [""], // An array of user IDs for the bot admins (you can use Discord's developer mode to find any user's ID).
  "serverSettingsCommandAliases": ["]settings", "]s"], // The aliases for the built-in settings command (discussed more later). If you don't want a settings command, this should be an empty array.
  "discordBotsDotOrgAPIKey": "", // If you have an API key from discordbots.org, insert it here and stats will be periodically sent.
  "botsDotDiscordDotPwAPIKey": "", // If you have an API key from bots.discord.pw, insert it here and stats will be periodically sent.
  "logsDirectory": "./logs", // The directory to write logs to (can be an empty string). Logs are also written to the console.
  "autoGeneratedHelpCommandAliases": ["bot!help", "bot!h"], // The aliases for the built-in help command. If you don't want a help command, this should be an empty array.
  "colorForAutoGeneratedHelpEmbeds": 2522111, // The built-in help command's advanced help uses embeds. This field controls the embed color.
  "commandsToGenerateHelpFor": [ // This should be an array of commands that you want to have help generated for, in the order that you want them to appear in the help.
    "bot!ping",
    "bot!addquote",
    "bot!getquote",
    "bot!navigation",
    "bot!countdown",
    "bot!about",
    "}setavatar",
    "}broadcast",
    "}delete",
    "}dumpheap",
    "}eval",
    "}servers",
    "]settings"
  ],
  "useANSIColorsInLogFiles": true,  // Whether ANSI color codes should be used in the log file or not. If you're going to be cat'ing log files in a console, you probably want this to be true. If you're going to be opening logs in notepad, you may want to set this to false.
  "serverAdminRoleName": "monochrome", // Users with a role with this name will be considered server admins able to run server admin commands.
  "genericErrorMessage": "Oh no, that command had an error! Please tell my owner to check the logs!", // If a command errors and that error escapes into core code, this message will be sent to the channel. If you don't want a generic error message, this can be an empty string.
  "genericDMReply": "Hi <user>, bot!help to see my commands!", // The bot will reply with this when DM'd, if the DM doesn't contain a command. <user> is replaced with the user's name.
  "genericMentionReply": "Hi <@user>, say bot!help to see my commands!", // The bot will reply like this when mentioned. <@user> mentions the user.
  "missingPermissionsErrorMessage": "I don't have permission to reply to that command in this channel (maybe I don't have permission to upload files, embed links, etc)", // If the bot cannot create a message due to missing permissions, and that error escapes into core code (which it generally should, more on that under Best Practices) then this message will be sent to the channel.
  "statusRotation": [ // An array of statuses to rotate through.
    "bot!help for commands!",
    "eating chicken",
    "buying games on steam"
  ],
  "statusRotationIntervalInSeconds": 600, // How often to change status.
  "colorForSettingsSystemEmbeds": 2522111, // The built-in settings command uses embeds. That field controls the color of those embeds.
  "settingsCategorySeparator": "/" // Settings are hierarchical. If the value of this field is "/", then a setting called "enabled" under a category called "lazer_cannon" will be referred to as "lazer_cannon/enabled"
}
```
### Advanced command configuration
Here is the same hello world command from above, but with all optional fields specified:
```js
module.exports = {
  commandAliases: ['bot!hello', 'bot!hi'], // Aliases for the command
  commandAliasesForHelp: ['bot!hello'], // The aliases that will appear in the auto-generated help. This is useful if you want the bot to respond to a certain alias, but you want to deprecate that alias or you would prefer for users to use other aliases. If your command provides this array, then only the aliases in this array will appear in the help.
  shortDescription: "You say bot!hello, I say Hello World!", // A one, maybe two sentence description that will appear in the help.
  longDescription: "You say bot!hello, I say Hello World! It's my most amazing feature", // A longer description that will appear in the advanced help for the command. If not provided, shortDescription will be used as the longDescription.
  usageExample: "bot!hello", // An example of how the user should invoke the command. If the command doesn't take any arguments (like this one), then there is probably no need to provide this.
  uniqueId: 'hello4859', // Can be anything, as long as it's unique, and you shouldn't change it.
  requiredSettings: ['hello/hello_text'], // What settings this command requires. See the Settings section below for more details, or the monochrome/commands/countdown.js command for an example.
  serverAdminOnly: false, // If true, only server admins can use this command. False by default.
  botAdminOnly: false, // If true, only bot admins (whose ids are listed in monochrome/config.js) can use this command. False by default.
  onlyInServer: false, // If true, this command will not be allowed in DMs. False by default.
  canBeChannelRestricted: true, // If true, then server admins can control which channels this command is allowed to execute in. If false, they cannot. True by default.
  action(bot, msg, suffix, settings, extension) { // Your code here! The bot argument is Eris.Client and the msg argument is Eris.Message. See the Eris help for info about them: https://abal.moe/Eris/docs. The suffix is the arguments for the command (for example if the user says "bot!hello 123" then the suffix is "123"). The settings argument is an object containing the required settings for the command. See the monochrome/commands/countdown.js command for an example. The extension argument is discussed below.
    return bot.createMessage(msg.channel.id, 'Hello World!');
  },
  canHandleExtension(extension) { // Return whether the command can handle a given extension (see below)
    return false;
  }
};
```
### Command extensions
Command extensions are an alternative to command arguments and command aliases, and may be more diserable in some cases.

As an example, consider a bot!translate command. If someone says "bot!translate German is fun", do they want to translate "German is fun" or do they want to translate "is fun" into German?

You might consider having separate commands like bot!translategerman, bot!translatefrench, bot!translateitalian, etc. Or you can use command extensions and have all of those invoke one command. This is especially useful if you do not know or do not want to list all of the languages that your translation API provides.

Here is how command extensions can be used in this scenario to respond to both bot!translategerman and bot!translatefrench:
```js
module.exports = {
  commandAliases: ['bot!translate'],
  uniqueId: 'hello4859',
  action(bot, msg, suffix, settings, extension) {
    if (extension === 'french') {
      return msg.channel.createMessage(translateFrench(suffix))
    } else if (extension === 'german') {
      return msg.channel.createMessage(translateGerman(suffix))
    }
  },
  canHandleExtension(extension) {
    return extension === 'french' || extension === 'german';
  }
};
```
### Message Processors
A message processor is like a more flexible command. It can choose whether to respond to any input. Here is a simple message processor:
```js
module.exports = {
  name: 'Palindrome',
  action: (bot, msg) => {
    let text = msg.content;
    let textBackwards = text.split('').reverse().join('');
    if (text === textBackwards) {
      bot.createMessage(msg.channel.id, 'That\'s a palindrome!');
      return true;
    } else {
      return false;
    }
  }
};
```
Save that as palindrome.js and drop it into the monochrome/message_processors directory. Start your bot and say 'racecar', 'hannah', etc to get a response.

If a message processor agrees to process the input, it should return true. If it does not agree to process the input, it should return false.
### Navigations
A navigation is a message that the bot edits in response to reactions, allowing a user to browse through pages of information.

![Navigation gif](https://github.com/mistval/monochrome/blob/master/nav.gif "Navigation gif")

See /commands/navigation.js for the code behind the above example.

Warning: In order to work around [a bug in the Discord client](https://trello.com/c/Nnkj5D0W/1154-editing-a-message-may-sometimes-cause-part-of-previous-message-to-appear) a navigation edits the message twice per reaction. That being the case, you are likely to see some rate limit warnings in the logs when people use navigations. Also, the workaround is not 100% effective, and sometimes the edited message may be messed up.
### Settings
It's easy to define settings that server admins can set on a per-channel basis, and that your commands can use.

You can define settings in monochrome/server_settings.json. The master branch has one setting there already as an example. The master branch's monochrome/server_settings.json looks like this:

```json
[
  {
    "type": "CATEGORY",
    "userFacingName": "fun",
    "children":
    [
      {
        "type": "SETTING",
        "userFacingName": "countdown_start",
        "description": "This setting controls what number I'll count down from when you use the bot!countdown command.",
        "valueType": "INTEGER",
        "defaultDatabaseFacingValue": 10,
        "allowedDatabaseFacingValues": "Range(1, 10)"
      }
    ]
  }
]
```
This adds a settings category called 'fun' with a setting called 'countdown_start'. The monochrome/commands/countdown.js command uses this setting to decide what number the countdown should start at.

With this setting defined in server_settings.json, it will now appear when a server admin uses the settings command. [Here is how a server admin would view and set this setting.](https://github.com/mistval/monochrome/blob/master/settings_example.png)

In the above linked image, you may notice that there is also an enabled_commands settings category. This category is automatically generated by monochrome and lets server admins control where commands can and cannot be used.

See monochrome/commands/countdown.js to see how the countdown command requires and accesses the value of this setting.
### Dynamic reloading
In general, when you change bot code, it is safest to stop and restart the bot. But if your bot has non-persistent data that you don't want to lose, or if you want absolutely zero downtime, monochrome supports dynamic reloading of code via the }reload command. You can add, remove, or modify commands and any other code of yours on the fly, without stopping the bot.

In order to support this, you must do one thing. Use ```reload``` instead of ```require``` to import your modules. See monochrome/commands/broadcast.js for an example.

You should only ```reload``` your own code. Core monochrome code, and npm modules, should be imported normally with ```require```. While most core monochrome code can be reloaded, some must not be, so unless you are planning to change and reload core code on the fly, it is best to ```require``` all of it.

```Reload``` does not play nicely with singletons or other modules that have static data. For best results when using the }reload command, avoid static data in your code. If you must have static data, use ```require``` instead of ```reload``` to import files that contain static data. Consider separating static data and program logic into separate files, so that you can ```reload``` program logic and ```require``` static data.
### Persistence
Persistence powered by node-persist is built in. See the included commands: addquote.js and getrandomquote.js for an example.
### Logging
The Logger singleton can be used for logging.
```js
const Logger = require('./../core/Logger.js'); // Path relative to the monochrome/commands directory.

Logger.logSuccess('TITLE', 'message');
Logger.logFailure('TITLE', 'message', errorObjectIfThereIsOne);
```
### Documentation
JSDoc can be used to generate documentation for the core classes.
```
npm install -g jsdoc
sh monochrome/generate_documentation.sh
```
And then open monochrome/documentation/index.html.

The core code (mostly) complies with Google's JavaScript coding conventions, with the exception of its maximum line length limit. Code style in the core classes can be checked with ```sh monochrome/style_checks.sh```
### Tests
```
npm install -g nyc
npm test
```
## Best Practices And What to Return to Core
This section mainly discusses what the action() function of your commands and message processors should return when invoked.

The simplest thing you can do is return nothing from commands. From message processors, you can return true if the message processor agrees to handle the message, false if not. 

However, doing this does not take full advantage of monochrome's built-in error handling and logging.
### Returning promises
It is best for a command to return a promise, and for a message processor to return a promise if it agrees to handle the message, or false if it does not.

When your command returns a promise, the command manager will wait for that promise to resolve before logging success. If the promise rejects, the command manager will log that as a failure, along with a stack trace, and will also send the genericErrorMessage from your config.json to the channel (unless the error is a PublicError, which is discussed below).

TIP: Most Eris methods return promises, for example ```msg.channel.createMessage('hi')``` returns a promise. Therefore, when you call msg.channel.createMessage() to send the result of the command to the channel, you should return: ```return msg.channel.createMessage('hi')```. By doing this, you ensure that errors such as over-sized messages are caught and logged.
### Throwing
If your command fails in an irrecoverable way (even if it's an expected failure), you should throw and allow the bot core to handle it (by logging it and sending a failure message).
### Throwing PublicError
PublicError is a class available from monochrome/core/public_error.js

For expected failures, you generally should throw a PublicError.

Here is an example of throwing PublicError:
```js
...
}).catch(err => {
  throw new PublicError('Sorry, Jisho is not responding. Please try again later.', 'Error fetching from Jisho', err);
});
```
When the command manager catches your PublicError, it will send the public message to the channel:

![PublicError channel message](https://github.com/mistval/monochrome/blob/master/public_error_message.png)

It will also log the error with the error reason and the stack trace:

![PublicError log message](https://github.com/mistval/monochrome/blob/master/public_error_log.png)

All three arguments for PublicError's constructor are optional. Pass in undefined or null for any arguments you don't want to provide. The first argument can be an object with an embed.
## Sample bot
Add my bot [Kotoba](https://discordapp.com/oauth2/authorize?client_id=251239170058616833&scope=bot) to your server to see an example of a bot running on monochrome.
## Help
[Support](https://discord.gg/f4Gkqku)

While the releases are well tested, the master branch is more experimental. If you encounter a bug, or want to suggest a feature, please open an issue, as I take this project seriously and would like it to meet your needs.