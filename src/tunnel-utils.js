'use strict';

export default {
  /**
   * Wraps the givent function, ensuring that it will only be called
   * when the message has the given eventName and originates from the same window
   */
  tunnelEvents(eventName, fn) {
    return function (event) {
      const message = event.data;
      if (
        event.source !== window
        || typeof message !== 'object'
        || message == null
        || message.name !== eventName
      ) {
        return;
      }
      fn(message);
    };
  }
};
