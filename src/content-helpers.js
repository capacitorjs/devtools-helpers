'use strict';

import TunnelUtils from './tunnel-utils.js';

export default {
  connectToBackground(portName) {
    return new Promise(function (resolve) {
      const port = chrome.runtime.connect({name: portName});
      const listener = function (message) {
        if (message.name === 'background:connect') {
          port.postMessage({name: 'register'});
          port.onMessage.removeListener(listener);
          resolve(port);
        }
      };

      port.onMessage.addListener(listener);
    });
  },

  /**
   * Tunnel events from the injected script to the panel, and vice-versa
   * Tunneling happens by means of the background page
   */
  proxyEvents(port) {
    // tunnel events from the injected script to the panel
    const injectedToPanel = TunnelUtils.tunnelEvents(window, 'tunnel:panel', function (message) {
      port.postMessage(message);
    });

    // tunnel events from the panel to the injected script
    const panelToInjected = function (message) {
      if (message.name === 'tunnel:injected') {
        window.postMessage(message, '*');
      }
    };

    window.addEventListener('message', injectedToPanel);
    port.onMessage.addListener(panelToInjected);

    return function () {
      window.removeEventListener('message', injectedToPanel);
      port.onMessage.removeListener(panelToInjected);
    };
  },

  /**
   * A convenience method to connect to the background page and proxy events.
   * Does not provide a convenient way to unregister events,
   * as it assumes the listeners will live for the length of the application
   * @return the port
   */
  initializeContent(portName) {
    return this.connectToBackground(portName).then((port) => {
      this.proxyEvents(port);
      return port;
    });
  }
};
