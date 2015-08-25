'use strict';

import ContentHelpers from 'src/content-helpers';

describe('ContentHelpers', function () {
  beforeEach(function () {
    this.portName = 'content-port';
    this.port = {
      onMessage: {
        addListener: this.sandbox.stub(),
        removeListener: this.sandbox.stub()
      },
      postMessage: this.sandbox.stub()
    };
    this.sandbox.stub(chrome, 'runtime', {
      connect: this.sandbox.stub().returns(this.port)
    });
    this.sandbox.stub(window, 'addEventListener');
    this.sandbox.stub(window, 'removeEventListener');
    // postMessage is required by babel browser-polyfill
    this.sandbox.spy(window, 'postMessage');
  });

  describe('connectToBackground', function () {
    beforeEach(function () {
      this.result = ContentHelpers.connectToBackground(this.portName);
    });

    it('opens a background connection', function () {
      expect(chrome.runtime.connect).to.have.been.calledOnce
        .and.calledWith({name: this.portName});
    });

    it('returns a promise', function () {
      expect(this.result).to.be.an.instanceOf(Promise);
    });

    describe('on "background:connect"', function () {
      beforeEach(function () {
        this.listener = this.port.onMessage.addListener.firstCall.args[0];
        this.listener({name: 'background:connect'});
      });

      it('it triggers the "register" event', function () {
        expect(this.port.postMessage).to.have.been.calledOnce
          .and.calledWith({name: 'register'});
      });

      it('removes the listener', function () {
        expect(this.port.onMessage.removeListener).to.have.been.calledOnce
          .and.calledWith(this.listener);
      });

      it('resolves a promise', function (done) {
        Promise.resolve(1).then(function () {
          done();
        });
      });

      it('resolves the returned promise with the port', function () {
        return expect(this.result).to.eventually.equal(this.port);
      });
    });
  });

  describe('proxyEvents', function () {
    beforeEach(function () {
      this.result = ContentHelpers.proxyEvents(this.port);
      this.toPanel = window.addEventListener.firstCall.args[1];
      this.toInjected = this.port.onMessage.addListener.firstCall.args[0];
    });

    it('forwards "tunnel:panel" messages from the window to the port', function () {
      const message = {
        data: {name: 'tunnel:panel'},
        source: window
      };
      this.toPanel(message);
      expect(this.port.postMessage).to.have.been.calledOnce
        .and.calledWith(message.data);
    });

    it('forwards "tunnel:injected" messages from the port to the window', function () {
      const message = {name: 'tunnel:injected'};
      this.toInjected(message);
      expect(window.postMessage).to.have.been.calledOnce
        .and.calledWith(message, '*');
    });

    describe('calling the returned function', function () {
      beforeEach(function () {
        this.result();
      });

      it('tears down the tunnel from injected to panel', function () {
        expect(window.removeEventListener).to.have.been.calledOnce
          .and.calledWith('message', this.toPanel);
      });

      it('tears down the tunnel from panel to injected', function () {
        expect(this.port.onMessage.removeListener).to.have.been.calledOnce
          .and.calledWith(this.toInjected);
      });
    });
  });

  describe('initializeContent', function () {
    beforeEach(function () {
      this.sandbox.stub(ContentHelpers, 'connectToBackground')
        .withArgs(this.portName).returns(Promise.resolve(this.port));
      this.sandbox.stub(ContentHelpers, 'proxyEvents');
      this.result = ContentHelpers.initializeContent(this.portName);
      return this.result;
    });

    it('connects the background and proxies events', function () {
      expect(ContentHelpers.connectToBackground).to.have.been.calledOnce
        .and.calledWith(this.portName);
      expect(ContentHelpers.proxyEvents).to.have.been.calledOnce
        .and.calledWith(this.port)
        .and.calledAfter(ContentHelpers.connectToBackground);
    });

    it('returns a promise that resolves to the port', function () {
      return expect(this.result).to.eventually.equal(this.port);
    });
  });
});
