'use strict';

import EmitterWindowBridge from './emitter-window-bridge'

export default {
  /**
   * Tunnel events from the content script to the emitter
   * and from the emitter to the content script
   *
   * @return a function that tears down the listeners
   */
  proxyEvents(emitter) {
    return EmitterWindowBridge.proxyEvents(window, window, emitter, 'tunnel:panel', 'tunnel:injected');
  }
};
