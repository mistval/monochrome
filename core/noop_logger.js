class NoopLogger {
  fatal() { }
  error() { }
  warn() { }
  info() { }
  debug() { }
  trace() { }
  addSerializers() { }

  child() {
    return new NoopLogger();
  }
}

module.exports = NoopLogger;
