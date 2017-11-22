'use strict'
const reload = require('require-reload')(require);
module.exports.Bot = require('./core/bot.js');
module.exports.PublicError = reload('./core/public_error.js');
module.exports.logger = require('./core/logger.js');
module.exports.persistence = require('./core/persistence.js');
module.exports.NavigationPage = reload('./core/navigation_page.js');
module.exports.NavigationChapter = reload('./core/navigation_chapter.js');
module.exports.navigationManager = reload('./core/navigation_manager.js');
module.exports.Navigation = reload('./core/navigation.js');