class FulfillmentError {
  constructor({
    publicMessage, error, logDescription, autoDeletePublicMessage, logLevel,
  }) {
    this.message = `(FulfillmentError) ${logDescription}`;
    this.publicMessage = publicMessage;
    this.error = error;
    this.logDescription = logDescription;
    this.autoDeletePublicMessage = !!autoDeletePublicMessage;
    this.logLevel = logLevel || 'warn';
  }
}

module.exports = FulfillmentError;
