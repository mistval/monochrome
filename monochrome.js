const FPersist = require('./src/storage_fpersist.js');
const MongoStorage = require('./plugins/storage_mongo/index.js');
const getErisVersionSync = require('./src/util/get_eris_version_sync.js');

module.exports = require('./src/bot.js');
module.exports.FulfillmentError = require('./src/fulfillment_error.js');
module.exports.SettingsConverters = require('./src/settings_converters.js');
module.exports.SettingsValidators = require('./src/settings_validators.js');

module.exports.erisVersion = getErisVersionSync();
module.exports.Permissions = require('./src/permissions.js').discordApiStringForPermission;
module.exports.ConsoleLogger = require('./src/console_logger.js');
module.exports.InteractiveMessage = require('./src/components/interactive_message.js').InteractiveMessage;

Object.assign(
  module.exports,
  require('./src/components/message_components.js'),
  require('./src/components/paginated_message.js'),
  require('./src/components/interactive_message.js'),
);

module.exports.Plugins = {
  FPersist,
  MongoStorage,
};
