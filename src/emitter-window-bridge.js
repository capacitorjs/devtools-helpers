'use strict';

import TunnelUtils from './tunnel-utils.js';

export default {
  /**
   * Tunnel events to/from a window/iframe to/from the emitter.
   * Only events of the given names will be tunneled
   */
  proxyEvents(sourceWindow, targetWindow, emitter, toWindowEvent, toEmitterEvent) {
    const windowToEmitter = TunnelUtils.tunnelEvents(sourceWindow, toEmitterEvent, function (message) {
      emitter.emit(message.event, message.payload);
    });

    // publish emitter events to the content script
    const emitterToWindow = function (event, payload) {
      targetWindow.postMessage({
        name: toWindowEvent,
        event,
        payload
      }, '*');
    };

    targetWindow.addEventListener('message', windowToEmitter);
    emitter.on(toWindowEvent, emitterToWindow);

    return function () {
      targetWindow.removeEventListener('message', windowToEmitter);
      emitter.removeListener(toWindowEvent, emitterToWindow);
    };
  }
};
