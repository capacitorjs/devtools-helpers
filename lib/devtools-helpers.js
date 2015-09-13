(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	
	var _panelHelpers = __webpack_require__(1);
	
	var _panelHelpers2 = _interopRequireDefault(_panelHelpers);
	
	var _injectedHelpers = __webpack_require__(2);
	
	var _injectedHelpers2 = _interopRequireDefault(_injectedHelpers);
	
	var _contentHelpers = __webpack_require__(5);
	
	var _contentHelpers2 = _interopRequireDefault(_contentHelpers);
	
	var _backgroundHelpers = __webpack_require__(6);
	
	var _backgroundHelpers2 = _interopRequireDefault(_backgroundHelpers);
	
	var _tunnelUtils = __webpack_require__(4);
	
	var _tunnelUtils2 = _interopRequireDefault(_tunnelUtils);
	
	var _emitterWindowBridge = __webpack_require__(3);
	
	var _emitterWindowBridge2 = _interopRequireDefault(_emitterWindowBridge);
	
	exports['default'] = {
	  PanelHelpers: _panelHelpers2['default'],
	  InjectedHelpers: _injectedHelpers2['default'],
	  ContentHelpers: _contentHelpers2['default'],
	  BackgroundHelpers: _backgroundHelpers2['default'],
	  TunnelUtils: _tunnelUtils2['default'],
	  EmitterWindowBridge: _emitterWindowBridge2['default']
	};
	module.exports = exports['default'];

/***/ },
/* 1 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	
	var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();
	
	exports['default'] = {
	  /**
	   * Connect to the bacground page,
	   * immediately initializing any scripts and listening for messages to forward
	   * @param emitter a node-sytle EventEmitter
	   */
	  connectToBackground: function connectToBackground(portName) {
	    return new Promise(function (resolve) {
	      // Create a connection to the background page
	      var port = chrome.runtime.connect({ name: portName });
	
	      var listener = function listener(message) {
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
	  injectContent: function injectContent(port, contentScript) {
	    return new Promise(function (resolve) {
	      var listener = function listener(message) {
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
	  proxyEvents: function proxyEvents(port, emitter) {
	    var backgroundListener = function backgroundListener(message) {
	      if (message.name === 'tunnel:panel') {
	        emitter.emit(message.event, message.payload);
	      }
	    };
	
	    var panelListener = function panelListener(event, payload) {
	      port.postMessage({
	        name: 'tunnel:injected',
	        event: event,
	        payload: payload
	      });
	    };
	
	    var toInjected = 'tunnel:injected';
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
	  injectScript: function injectScript(scriptFile) {
	    return new Promise(function (resolve, reject) {
	      // URL scheme "chrome-extension" is not supported by Chrome's fetch yet
	      var injectedXHR = new XMLHttpRequest();
	      injectedXHR.open('get', scriptFile, true);
	      injectedXHR.addEventListener('load', function (xhrResult) {
	        var injectedScript = xhrResult.target.response;
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
	   *
	   * Note that this does not provide the convenient ability to tear down listeners,
	   * as it assumes the event-listening will be running for the lifetime of the application
	   * @param portName
	   * @param emitter a node-sytle event emitter
	   * @param contentScript the location of the content script to inject
	   * @param inspectedScript the location of the script to inject into the inspected window
	   * @returns {Promise} resolves when all scripts are injected
	   */
	  initializePanel: function initializePanel(portName, emitter, contentScript, inspectedScript) {
	    var _this = this;
	
	    var background = this.connectToBackground(portName);
	    var content = background.then(function (port) {
	      _this.proxyEvents(port, emitter);
	      return _this.injectContent(port, contentScript).then(function () {
	        return port;
	      });
	    });
	    var injected = this.injectScript(inspectedScript);
	    return Promise.all([content, injected]).then(function (_ref) {
	      var _ref2 = _slicedToArray(_ref, 1);
	
	      var port = _ref2[0];
	
	      return port;
	    });
	  }
	};
	module.exports = exports['default'];

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	
	var _emitterWindowBridge = __webpack_require__(3);
	
	var _emitterWindowBridge2 = _interopRequireDefault(_emitterWindowBridge);
	
	exports['default'] = {
	  /**
	   * Tunnel events from the content script to the emitter
	   * and from the emitter to the content script
	   *
	   * @return a function that tears down the listeners
	   */
	  proxyEvents: function proxyEvents(emitter) {
	    return _emitterWindowBridge2['default'].proxyEvents(window, window, emitter, 'tunnel:panel', 'tunnel:injected');
	  }
	};
	module.exports = exports['default'];

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	
	var _tunnelUtilsJs = __webpack_require__(4);
	
	var _tunnelUtilsJs2 = _interopRequireDefault(_tunnelUtilsJs);
	
	exports['default'] = {
	  /**
	   * Tunnel events to/from a window/iframe to/from the emitter.
	   * Only events of the given names will be tunneled
	   */
	  proxyEvents: function proxyEvents(sourceWindow, targetWindow, emitter, toWindowEvent, toEmitterEvent) {
	    var windowToEmitter = _tunnelUtilsJs2['default'].tunnelEvents(sourceWindow, toEmitterEvent, function (message) {
	      emitter.emit(message.event, message.payload);
	    });
	
	    // publish emitter events to the content script
	    var emitterToWindow = function emitterToWindow(event, payload) {
	      targetWindow.postMessage({
	        name: toWindowEvent,
	        event: event,
	        payload: payload
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
	module.exports = exports['default'];

/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	exports['default'] = {
	  /**
	   * Wraps the givent function, ensuring that it will only be called
	   * when the message has the given eventName and originates from the same window
	   */
	  tunnelEvents: function tunnelEvents(sourceWindow, eventName, fn) {
	    return function (event) {
	      var message = event.data;
	      if (event.source !== sourceWindow || typeof message !== 'object' || message == null || message.name !== eventName) {
	        return;
	      }
	      fn(message);
	    };
	  }
	};
	module.exports = exports['default'];

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	
	var _tunnelUtilsJs = __webpack_require__(4);
	
	var _tunnelUtilsJs2 = _interopRequireDefault(_tunnelUtilsJs);
	
	exports['default'] = {
	  connectToBackground: function connectToBackground(portName) {
	    return new Promise(function (resolve) {
	      var port = chrome.runtime.connect({ name: portName });
	      var listener = function listener(message) {
	        if (message.name === 'background:connect') {
	          port.postMessage({ name: 'register' });
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
	  proxyEvents: function proxyEvents(port) {
	    // tunnel events from the injected script to the panel
	    var injectedToPanel = _tunnelUtilsJs2['default'].tunnelEvents(window, 'tunnel:panel', function (message) {
	      port.postMessage(message);
	    });
	
	    // tunnel events from the panel to the injected script
	    var panelToInjected = function panelToInjected(message) {
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
	  initializeContent: function initializeContent(portName) {
	    var _this = this;
	
	    return this.connectToBackground(portName).then(function (port) {
	      _this.proxyEvents(port);
	      return port;
	    });
	  }
	};
	module.exports = exports['default'];

/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	
	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
	
	var tabIdFromPort = function tabIdFromPort(port) {
	  return port.sender.tab.id;
	};
	
	/**
	 * Helpers for working with the Devtools background page
	 * inspired by https://developer.chrome.com/extensions/devtools#solutions
	 */
	exports['default'] = {
	  /**
	   * Create a registry object that will maintain the status of a background page
	   */
	  newRegistry: function newRegistry() {
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
	  newPanelListener: function newPanelListener(registry) {
	    return function (message, sendingPort) {
	      var panelId = tabIdFromPort(sendingPort);
	
	      if (message.name === 'register-content') {
	        registry.panelToContent[panelId] = message.contentTabId;
	        registry.contentToPanel[message.contentTabId] = panelId;
	        chrome.tabs.executeScript(message.contentTabId, { file: message.file });
	      } else if (message.name === 'tunnel:injected') {
	        var contentPort = registry.contentConnections[registry.panelToContent[panelId]];
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
	  newContentListener: function newContentListener(registry) {
	    return function (message, sendingPort) {
	      var contentId = tabIdFromPort(sendingPort);
	      var panelPort = registry.panelConnections[registry.contentToPanel[contentId]];
	      if (message.name === 'register') {
	        panelPort.postMessage({ name: 'content:registered' });
	      } else if (message.name === 'tunnel:panel') {
	        panelPort.postMessage(message);
	      }
	    };
	  },
	
	  /**
	   * Register a connection from a port, caching its connection,
	   * attacting a listener, and preparing for event teardown
	   */
	  registerConnection: function registerConnection(port, connections, idCache, listener) {
	    var id = tabIdFromPort(port);
	    connections[id] = port;
	    port.onMessage.addListener(listener);
	
	    port.onDisconnect.addListener(function () {
	      port.onMessage.removeListener(listener);
	      delete connections[id];
	      delete idCache[id];
	    });
	
	    port.postMessage({ name: 'background:connect' });
	  },
	
	  /**
	   * Handle a port connections based on port name
	   * accepts an object of type {[portName]: function (port) -> void}
	   *
	   * When a port connects, the handler registered with that port's name will be
	   * called with the port.
	   */
	  handleConnections: function handleConnections(portMap) {
	    var listener = function listener(port) {
	      var handler = portMap[port.name];
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
	  initializeBackground: function initializeBackground(panelPortName, contentPortName) {
	    var _handlers,
	        _this = this;
	
	    var registry = this.newRegistry();
	    var panelListener = this.newPanelListener(registry);
	    var contentListener = this.newContentListener(registry);
	    var handlers = (_handlers = {}, _defineProperty(_handlers, panelPortName, function (port) {
	      _this.registerConnection(port, registry.panelConnections, registry.panelToContent, panelListener);
	    }), _defineProperty(_handlers, contentPortName, function (port) {
	      _this.registerConnection(port, registry.contentConnections, registry.contentToPanel, contentListener);
	    }), _handlers);
	    this.handleConnections(handlers);
	    return registry;
	  }
	};
	module.exports = exports['default'];

/***/ }
/******/ ])
});
;
//# sourceMappingURL=devtools-helpers.js.map