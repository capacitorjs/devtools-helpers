'use strict';

export default {
  /**
   * Tunnel events from the content script to the emitter
   * and from the emitter to the content script
   *
   * @return a function that tears down the listeners
   */
  connectToContent(emitter) {
    // publish content script messages to the emitter
    const contentToEmitter = function (event) {
      const message = event.data;

      // Only accept messages that we know are ours
      if (
        event.source !== window
        || typeof message !== 'object'
        || message == null
        || message.name !== 'tunnel:injected'
      ) {
        return;
      }

      emitter.emit(message.event, message.payload);
    };

    // publish emitter events to the content script
    const emitterToContent = function (event, payload) {
      window.postMessage({
        name: 'tunnel:devtools',
        event,
        payload
      }, '*');
    };

    window.addEventListener('message', contentToEmitter);
    emitter.on('tunnel:devtools', emitterToContent);

    return function () {
      window.removeEventListener('message', contentToEmitter);
      emitter.removeListener('tunnel:devtools', emitterToContent);
    };
  }
};
