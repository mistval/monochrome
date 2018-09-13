'use strict'

class LogMessageBuilder {
  constructor() {
    this.messageWithFormatting_ = '';
    this.messageWithoutFormatting_ = '';
  }

  getMessageWithFormatting() {
    return this.messageWithFormatting_;
  }

  getMessageWithoutFormatting() {
    return this.messageWithFormatting_;
  }

  setColor(color) {
    this.messageWithFormatting_ += color;
  }

  append(textOrMessageBuilder) {
    if (typeof textOrMessageBuilder === typeof '') {
      this.messageWithFormatting_ += textOrMessageBuilder;
      this.messageWithoutFormatting_ += textOrMessageBuilder;
    } else {
      this.messageWithFormatting_ += textOrMessageBuilder.getMessageWithFormatting();
      this.messageWithoutFormatting_ += textOrMessageBuilder.getMessageWithoutFormatting();
    }
  }
}

module.exports = LogMessageBuilder;
