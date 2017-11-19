class Logger {
  constructor() {
    this.failureMessages = [];
  }

  logSuccess(title, message) {
    this.succeeded = true;
    this.successMessage = message;
  }

  logFailure(loggerTitle, failureMessage, err) {
    this.failed = true;
    this.error = err;
    this.failureMessage = failureMessage;
    this.failureMessages.push(failureMessage);
  }

  logInputReaction(title, msg, inputReactorTitle, succeeded, failureMessage) {
    this.msg = msg;
    this.failureMessage = failureMessage;
    this.failureMessages.push(failureMessage);
    if (succeeded) {
      this.succeeded = true;
      this.failed = false;
    } else {
      this.failed = true;
      this.succeeded = false;
    }
  }
}

module.exports = Logger;
