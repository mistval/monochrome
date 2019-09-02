module.exports = require('./src/bot.js');
module.exports.FulfillmentError = require('./src/fulfillment_error.js');
module.exports.NavigationChapter = require('./src/navigation_chapter.js');
module.exports.Navigation = require('./src/navigation.js');
module.exports.SettingsConverters = require('./src/settings_converters.js');
module.exports.SettingsValidators = require('./src/settings_validators.js');
module.exports.erisVersion = require('eris/package.json').version;
module.exports.Permissions = require('./src/permissions.js').discordApiStringForPermission;
module.exports.ConsoleLogger = require('./src/console_logger.js');
module.exports.Plugins = {
  FPersist: require('./src/storage_fpersist.js'),
};
