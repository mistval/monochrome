'use strict'
const NavigationPage = require('./navigation_page.js');

const LOGGER_TITLE = 'NAVIGATION';

class NavigationChapter {
  constructor(dataSource, prepareDataArgument) {
    this.dataSource_ = dataSource;
    this.prepareDataArgument_ = prepareDataArgument;
    this.pages_ = [];
    this.currentPageIndex_ = 0;
  }

  static fromContent(contents) {
    let navigationPages = [];
    for (let content of contents) {
      navigationPages.push(new NavigationPage(content));
    }

    return NavigationChapter.fromNavigationPages(navigationPages);
  }

  static fromNavigationPages(pages) {
    let dataSource = {};
    dataSource.prepareData = () => {
      return pages;
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
        this.preparedData_ = await this.dataSource_.prepareData(this.prepareDataArgument_);
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
        if (page && !page.content) {
          page = new NavigationPage(page);
        }
        while (this.pages_.length <= pageToGet) {
          this.pages_.push(undefined);
        }
        if (!this.pages_[pageToGet]) {
          this.pages_[pageToGet] = page;
        }
        if (page && page.content) {
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
