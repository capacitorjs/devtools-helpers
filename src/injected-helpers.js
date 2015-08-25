'use strict';

import TunnelUtils from './tunnel-utils.js';

export default {
  /**
   * Tunnel events from the content script to the emitter
   * and from the emitter to the content script
   *
   * @return a function that tears down the listeners
   */
  proxyEvents(emitter) {
    // publish content script messages to the emitter
    const contentToEmitter = TunnelUtils.tunnelEvents('tunnel:injected', function (message) {
      emitter.emit(message.event, message.payload);
    });

    // publish emitter events to the content script
    const emitterToContent = function (event, payload) {
      window.postMessage({
        name: 'tunnel:panel',
        event,
        payload
      }, '*');
    };

    window.addEventListener('message', contentToEmitter);
    emitter.on('tunnel:panel', emitterToContent);

    return function () {
      window.removeEventListener('message', contentToEmitter);
      emitter.removeListener('tunnel:panel', emitterToContent);
    };
  }
};
