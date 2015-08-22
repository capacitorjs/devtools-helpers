'use strict';

/**
 * Connect to the bacground page,
 * immediately initializing any scripts and listening for messages to forward
 * @param bus
 */
export function connectToBackground(portName) {
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

    // tunnel from injected to bus
    port.onMessage.addListener(listener);
  });
}

/**
 * Inject the given content script.
 * Requires the cooperation of background-helpers
 * @param port
 * @param contentScript
 * @returns {Promise}
 */
export function injectContent(port, contentScript) {
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
}

/**
 * Tunnel events from the background page to the message bus
 * and from the message bus to the background page
 * Requires the cooperation of background-helpers, content-helpers, and injected-helpers
 * @param port
 * @param bus
 * @return () -> void A function that disposes of the listeners
 */
export function proxyEvents(port, bus) {
  const disposeBus = bus.on('tunnel:injected', function (event, payload) {
    port.postMessage({
      name: 'tunnel:injected',
      event,
      payload
    });
  });

  const tunnelListener = function (message) {
    if (message.name === 'tunnel:devtools') {
      bus.emit(message.event, message.payload);
    }
  };
  port.onMessage.addListener(tunnelListener);

  return function () {
    disposeBus();
    port.onMessage.removeListener(tunnelListener);
  };
}

/**
 * Inject the given script file into the inspected window
 * @param scriptFile
 */
export function injectScript(scriptFile) {
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
}

/**
 * A convenience method to forward messages, inject a content page,
 * and inject an inspected script
 * @param portName
 * @param bus
 * @param contentScript
 * @param inspectedScript
 * @returns {Promise}
 */
export function initializePanel(portName, bus, contentScript, inspectedScript) {
  const background = connectToBackground(portName);
  const content = background.then(function (port) {
    proxyEvents(port, bus);
    return injectContent(port, contentScript);
  });
  const injected = injectScript(inspectedScript);
  return Promise.all([content, injected]).then(function ([port]) {
    return port;
  });
}
