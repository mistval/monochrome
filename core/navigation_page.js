'use strict'
/**
* Represents one page in a navigation
*/
class NavigationPage {
  /**
  * @param {(String|Object)} content - The content for the page, it is what will get passed into Eris' createMessage method.
  * @param {Object} [file] - The file object to pass into Eris' createMessage method.
  */
  constructor(content, file) {
    this.content = content;
    this.file = file;
  }
}

module.exports = NavigationPage;
