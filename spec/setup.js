'use strict';

beforeEach(function () {
  this.sandbox = sinon.sandbox.create();
  window.chrome = window.chrome || {};
  window.chrome.runtime = window.chrome.runtime || {};
  window.chrome.devtools = window.chrome.devtools || {};
  window.chrome.tabs = window.chrome.tabs || {};
  this.server = sinon.fakeServer.create();
});

afterEach(function () {
  this.sandbox.restore();
  this.server.restore();
});
