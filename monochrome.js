'use strict'
const monochrome = require('./core/monochrome.js');
const fs = require('fs');

let configFilePath = __dirname + '/config.json';
let commandsDirectoryPath = __dirname + '/commands';
let messageProcessorsDirectoryPath = __dirname + '/message_processors';
let settingsFilePath = __dirname + '/server_settings.json';

if (!fs.existsSync(settingsFilePath)) {
  settingsFilePath = undefined;
}

let bot = new monochrome(configFilePath, commandsDirectoryPath, messageProcessorsDirectoryPath, settingsFilePath);
bot.connect();
