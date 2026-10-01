'use strict';

/** An error whose message is safe and meant to be shown to the user. */
class AppError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'AppError';
  }
}

module.exports = { AppError };
