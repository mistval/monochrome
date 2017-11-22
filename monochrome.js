'use strict'
const reload = require('require-reload')(require);
module.exports.Bot = require('./core/bot.js');
module.exports.PublicError = reload('./core/public_error.js');
module.exports.logger = require('./core/logger.js');
module.exports.persistence = require('./core/persistence.js');
