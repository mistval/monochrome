class Logger {
  logSuccess() {
    this.succeeded = true;
  }

  logFailure(loggerTitle, failureMessage, err) {
    this.failed = true;
    this.error = err;
    this.failureMessage = failureMessage;
  }

  logInputReaction(title, msg, inputReactorTitle, succeeded, failureMessage) {
    this.msg = msg;
    this.failureMessage = failureMessage;
    if (succeeded) {
      this.succeeded = true;
      this.failed = false;
    } else {
      this.failed = true;
      this.failed = false;
    }
  }
}

module.exports = Logger;
