const LOGGER_TITLE = 'NAVIGATION';

/**
 * This function is called when the user first navigates to this navigation chapter.
 * If you need to, for example, make an HTTP request to an API that does not support pagination,
 * you should do so here and return the result. If the API does support pagination, you can make
 * the requests page-by-page in {@link NavigationChapter~getPageFromPreparedData} instead.
 * This function will only be called once, when the user first navigates to this navigation chapter.
 * @callback NavigationChapter~prepareData
 * @returns {Object} The prepared data that will later be passed into {@link NavigationChapter~getPageFromPreparedData}. You can
 *   return anything or nothing.
 * @async
 */

 /**
  * This function is called when the user navigates to a page of the navigation chapter that they
  * have not yet navigated to. This function should return the Discord message content for that page.
  * This function is only called once. If the user navigates away and back to the page with the specified pageIndex,
  * the {@link NavigationManager} replies with cached message content rather than calling this function again.
  * @callback NavigationChapter~getPageFromPreparedData
  * @param {Object} preparedData - Whatever was returned from the {@link NavigationChapter~prepareData} function.
  * @param {number} pageIndex - The index of the page to return.
  * @returns {(Object|string|undefined)} - A string or [Discord embed structure]{@link https://discordapp.com/developers/docs/resources/channel#embed-object} representing
  *   the content to update the message with when the user navigates to the specified pageIndex. If the pageIndex is out of bounds, you can return undefined, and no
  *   navigation will occur.
  * @async
  */

/**
 * An object that lazily fetches the necessary data and converts it into Discord content structures.
 * @typedef {Object} NavigationChapter~dataSource
 * @property {NavigationChapter~prepareData} prepareData - A function to prepare the data to be displayed by this navigation chapter.
 * @property {NavigationChapter~getPageFromPreparedData} getPageFromPreparedData - A function to extract the current page from the prepared data.
 */


/**
 * Represents a one dimensional slice of navigable data.
 * If you create a navigation that uses emojis A, B, and C,
 * each of those is controlled by one NavigationChapter.
 * The navigation chapter controls what the user sees when they
 * use the arrow reaction buttons below the message to navigate forward
 * and backward within a chapter. Using other reaction buttons
 * switches to the NavigationChapter associated with that reaction.
 * A NavigationChapter is a sub-unit of a {@link Navigation}.
 * For more information about what a Navigation is, see {@link Navigation}
 */
class NavigationChapter {
  /**
   * Construct a navigation chapter. If you already have all the information you
   * want to send as a navigable Discord message, use the {@link NavigationChapter.fromContent}
   * factory method instead.
   * @param {NavigationChapter~dataSource} dataSource - The datasource that fetches the information to show as a navigable Discord message.
   */
  constructor(dataSource) {
    this.dataSource_ = dataSource;
    this.pages_ = [];
    this.currentPageIndex_ = 0;
  }

  /**
   * Create a navigation chapter using already-known message content.
   * @param {(string[]|Object[])} contents - An array of message objects.
   *   They can either be strings, or they can be [Discord embed structures]{@link https://discordapp.com/developers/docs/resources/channel#embed-object}.
   *   Each element in this array represents one Discord message. The user can use the arrow reaction buttons displayed below
   *   the message to show the next or previous message in this array.
   */
  static fromContent(contents) {
    let dataSource = {};
    dataSource.prepareData = () => {
      return contents;
    };
    dataSource.getPageFromPreparedData = (preparedData, pageIndex) => {
      return preparedData[pageIndex];
    };
    let chapter = new NavigationChapter(dataSource);
    return chapter;
  }

  async getCurrentPage(logger) {
    if (!this.preparedData_) {
      try {
        this.preparedData_ = await this.dataSource_.prepareData();
        if (this.preparedData_ === undefined) {
          this.preparedData_ = true;
        }
        return this.getCurrentPageFromPreparedData_(logger);
      } catch (err) {
        logger.logFailure(LOGGER_TITLE, 'Error preparing data for navigation.', err);
        throw err;
      }
    } else {
      return this.getCurrentPageFromPreparedData_(logger);
    }
  }

  flipToPreviousPage(logger) {
    if (this.currentPageIndex_ > 0) {
      --this.currentPageIndex_;
      return this.getCurrentPage(logger);
    }
    return Promise.resolve(undefined);
  }

  flipToNextPage(logger) {
    ++this.currentPageIndex_;
    return this.getCurrentPage(logger);
  }

  async getCurrentPageFromPreparedData_(logger) {
    let pageToGet = this.currentPageIndex_;
    if (this.pages_[pageToGet]) {
      return this.pages_[pageToGet];
    } else {
      try {
        let page = await this.dataSource_.getPageFromPreparedData(this.preparedData_, pageToGet);
        while (this.pages_.length <= pageToGet) {
          this.pages_.push(undefined);
        }
        if (!this.pages_[pageToGet]) {
          this.pages_[pageToGet] = page;
        }
        if (page) {
          return page;
        } else {
          this.pages_[pageToGet] = undefined;
          await this.flipToPreviousPage(logger);
          return undefined;
        }
      } catch (err) {
        logger.logFailure(LOGGER_TITLE, 'Error getting navigation page from prepared data.', err);
        await this.flipToPreviousPage(logger);
        return undefined;
      }
    }
  }
}

module.exports = NavigationChapter;
