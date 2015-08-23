(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
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
	
	var _panelHelpersJs = __webpack_require__(1);
	
	var _panelHelpersJs2 = _interopRequireDefault(_panelHelpersJs);
	
	exports['default'] = {
	  PanelHelpers: _panelHelpersJs2['default']
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
	      var port = chrome.runtime.connect({
	        name: portName
	      });
	
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
	      if (message.name === 'tunnel:devtools') {
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

/***/ }
/******/ ])
});
;
//# sourceMappingURL=devtools-helpers.js.map