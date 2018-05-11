'use strict'
const reload = require('require-reload')(require);
module.exports = require('./core/bot.js');
module.exports.PublicError = reload('./core/public_error.js');
module.exports.NavigationPage = reload('./core/navigation_page.js');
module.exports.NavigationChapter = reload('./core/navigation_chapter.js');
module.exports.Navigation = reload('./core/navigation.js');
