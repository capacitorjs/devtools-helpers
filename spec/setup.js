'use strict';

beforeEach(function () {
  this.sandbox = window.sinon.sandbox.create();
});

afterEach(function () {
  this.sandbox.restore();
});
