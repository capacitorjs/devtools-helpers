'use strict';

const tabIdFromPort = function (port) {
  return port.sender.tab.id;
};

/**
 * Helpers for working with the Devtools background page
 * inspired by https://developer.chrome.com/extensions/devtools#solutions
 */
export default {
  /**
   * Create a registry object that will maintain the status of a background page
   */
  newRegistry() {
    return {
      panelConnections: {},
      contentConnections: {},
      panelToContent: {},
      contentToPanel: {}
    };
  },

  /**
   * Return a new listener function that responds to messages from the panel
   * the message that the listener is called with determines the outcome:
   *
   * tunnel:injected -- forward the message to the appropriate content script
   * register-content -- tells the background page to inject the given content script
   */
  newPanelListener(registry) {
    return function (message, sendingPort) {
      const panelId = tabIdFromPort(sendingPort);

      if (message.name === 'register-content') {
        registry.panelToContent[panelId] = message.contentTabId;
        registry.contentToPanel[message.contentTabId] = panelId;
        chrome.tabs.executeScript(message.contentTabId, {file: message.file});
      } else if (message.name === 'tunnel:injected') {
        const contentPort = registry.contentConnections[registry.panelToContent[panelId]];
        contentPort.postMessage(message);
      }
    };
  },

  /**
   * Return a new listener function that responds to messages from the content page
   * the message that the listener is called with determines the outcome:
   *
   * tunnel:panel -- forward the message to the appropriate panel
   * register -- inform the panel that the content script has been registered
   */
  newContentListener(registry) {
    return function (message, sendingPort) {
      const contentId = tabIdFromPort(sendingPort);
      const panelPort = registry.panelConnections[registry.contentToPanel[contentId]];
      if (message.name === 'register') {
        panelPort.postMessage({name: 'content:registered'});
      } else if (message.name === 'tunnel:panel') {
        panelPort.postMessage(message);
      }
    };
  },

  /**
   * Register a connection from a port, caching its connection,
   * attacting a listener, and preparing for event teardown
   */
  registerConnection(port, connections, idCache, listener) {
    const id = tabIdFromPort(port);
    connections[id] = port;
    port.onMessage.addListener(listener);

    port.onDisconnect.addListener(function () {
      port.onMessage.removeListener(listener);
      delete connections[id];
      delete idCache[id];
    });

    port.postMessage({name: 'background:connect'});
  },

  /**
   * Handle a port connections based on port name
   * accepts an object of type {[portName]: function (port) -> void}
   *
   * When a port connects, the handler registered with that port's name will be
   * called with the port.
   */
  handleConnections(portMap) {
    const listener = function (port) {
      const handler = portMap[port.name];
      if (handler) {
        handler(port);
      }
    };

    chrome.runtime.onConnect.addListener(listener);
    return function () {
      chrome.runtime.onConnect.removeListener(listener);
    };
  },

  /**
   * A convenience method to handle connections
   * with the default handling of panel ports and content ports
   * sending messages back and forth
   *
   * Does not return an easy way of tearing down,
   * because it is meant to last for the lifetime of the background page.
   *
   * However, individual port connections will be properly torn down.
   */
  initializeBackground(panelPortName, contentPortName) {
    const registry = this.newRegistry();
    const panelListener = this.newPanelListener(registry);
    const contentListener = this.newContentListener(registry);
    const handlers = {
      [panelPortName]: (port) => {
        this.registerConnection(port, registry.panelConnections, registry.panelToContent, panelListener);
      },
      [contentPortName]: (port) => {
        this.registerConnection(port, registry.contentConnections, registry.contentToPanel, contentListener);
      }
    };
    this.handleConnections(handlers);
    return registry;
  }
};
