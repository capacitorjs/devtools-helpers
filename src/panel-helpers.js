'use strict';

/**
 * Connect to the bacground page,
 * immediately initializing any scripts and listening for messages to forward
 * @param bus
 */
export function connectToBackground(bus, initialContentFile) {
  return new Promise(function (resolve) {
    // Create a connection to the background page
    const port = chrome.runtime.connect({
      name: 'github.com/capacitorjs/devtools:panel'
    });

    // tunnel from injected to bus
    port.onMessage.addListener(function (message) {
      if (message.name === 'background:connect') {
        port.postMessage({
          name: 'register-content',
          contentTabId: chrome.devtools.inspectedWindow.tabId,
          file: initialContentFile
        });
      } else if (message.name === 'content:registered') {
        resolve();
      } else if (message.name === 'tunnel:devtools') {
        bus.emit(message.event, message.payload);
      }
    });

    // tunnel from bus to injected
    bus.on('tunnel:injected', function (event, payload) {
      port.postMessage({
        name: 'tunnel:injected',
        event,
        payload
      });
    });
  });
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
