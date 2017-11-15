'use strict'
const monochrome = require('./core/monochrome.js');

let configFilePath = __dirname + '/config.json';
let commandsDirectoryPath = __dirname + '/commands';
let messageProcessorsDirectoryPath = __dirname + '/message_processors';
let settingsFilePath = __dirname + '/server_settings.json';
let bot = new monochrome(configFilePath, commandsDirectoryPath, messageProcessorsDirectoryPath, settingsFilePath);
bot.connect();
