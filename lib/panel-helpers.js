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
/***/ function(module, exports) {

	'use strict';
	
	/**
	 * Connect to the bacground page,
	 * immediately initializing any scripts and listening for messages to forward
	 * @param bus
	 */
	Object.defineProperty(exports, '__esModule', {
	  value: true
	});
	exports.connectToBackground = connectToBackground;
	exports.injectScript = injectScript;
	
	function connectToBackground(bus, initialContentFile) {
	  return new Promise(function (resolve) {
	    // Create a connection to the background page
	    var port = chrome.runtime.connect({
	      name: 'github.com/cmaher/devtools-sandbox:panel'
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
	        event: event,
	        payload: payload
	      });
	    });
	  });
	}
	
	/**
	 * Inject the given script file into the inspected window
	 * @param scriptFile
	 */
	
	function injectScript(scriptFile) {
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
	}

/***/ }
/******/ ])
});
;
//# sourceMappingURL=panel-helpers.js.map