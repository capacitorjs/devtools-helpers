'use strict';

export default {
  /**
   * Connect to the bacground page,
   * immediately initializing any scripts and listening for messages to forward
   * @param emitter a node-sytle EventEmitter
   */
  connectToBackground(portName) {
    return new Promise(function (resolve) {
      // Create a connection to the background page
      const port = chrome.runtime.connect({
        name: portName
      });

      const listener = function (message) {
        if (message.name === 'background:connect') {
          port.onMessage.removeListener(listener);
          resolve(port);
        }
      };

      // tunnel from injected to emitter
      port.onMessage.addListener(listener);
    });
  },

  /**
   * Inject the given content script.
   * Requires the cooperation of background-helpers
   * @param port
   * @param contentScript
   * @returns {Promise}
   */
  injectContent(port, contentScript) {
    return new Promise(function (resolve) {
      const listener = function (message) {
        if (message.name === 'content:registered') {
          port.onMessage.removeListener(listener);
          resolve();
        }
      };

      port.onMessage.addListener(listener);

      port.postMessage({
        name: 'register-content',
        contentTabId: chrome.devtools.inspectedWindow.tabId,
        file: contentScript
      });
    });
  },

  /**
   * Tunnel events from the background page to the message emitter
   * and from the message emitter to the background page
   * Requires the cooperation of background-helpers, content-helpers, and injected-helpers
   * @param port a chrome.runtime.Port
   * @param emitter a node-style EventEmitter
   * @return () -> void A function that disposes of the listeners
   */
  proxyEvents(port, emitter) {
    const backgroundListener = function (message) {
      if (message.name === 'tunnel:devtools') {
        emitter.emit(message.event, message.payload);
      }
    };

    const panelListener = function (event, payload) {
      port.postMessage({
        name: 'tunnel:injected',
        event,
        payload
      });
    };

    const toInjected = 'tunnel:injected';
    emitter.on(toInjected, panelListener);
    port.onMessage.addListener(backgroundListener);

    return function () {
      emitter.removeListener(toInjected, panelListener);
      port.onMessage.removeListener(backgroundListener);
    };
  },

  /**
   * Inject the given script file into the inspected window
   * @param scriptFile
   */
  injectScript(scriptFile) {
    return new Promise(function (resolve, reject) {
      // URL scheme "chrome-extension" is not supported by Chrome's fetch yet
      const injectedXHR = new XMLHttpRequest();
      injectedXHR.open('get', scriptFile, true);
      injectedXHR.addEventListener('load', function (xhrResult) {
        const injectedScript = xhrResult.target.response;
        chrome.devtools.inspectedWindow.eval(injectedScript, function (result, isException) {
          if (isException) {
            reject(result);
          } else {
            resolve(result);
          }
        });
      });
      injectedXHR.send();
    });
  },

  /**
   * A convenience method to forward messages, inject a content page,
   * and inject an inspected script
   * @param portName
   * @param emitter a node-sytle event emitter
   * @param contentScript the location of the content script to inject
   * @param inspectedScript the location of the script to inject into the inspected window
   * @returns {Promise} resolves when all scripts are injected
   */
  initializePanel(portName, emitter, contentScript, inspectedScript) {
    const background = this.connectToBackground(portName);
    const content = background.then((port) => {
      this.proxyEvents(port, emitter);
      return this.injectContent(port, contentScript).then(function () {
        return port;
      });
    });
    const injected = this.injectScript(inspectedScript);
    return Promise.all([content, injected]).then(function ([port]) {
      return port;
    });
  }
};
