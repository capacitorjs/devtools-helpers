'use strict';

import {EventEmitter} from 'events';
import PanelHelpers from 'src/panel-helpers';

describe('PanelHelpers', function () {
  const getPortMessageHandler = function (port) {
    return port.onMessage.addListener.firstCall.args[0];
  };

  beforeEach(function () {
    this.tabId = 'suchTabId';
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
    this.sandbox.stub(chrome, 'devtools', {
      inspectedWindow: {
        tabId: this.tabId,
        eval: this.sandbox.stub()
      }
    });
  });

  describe('connectToBackground', function () {
    beforeEach(function () {
      this.portName = 'suchPort';
      this.result = PanelHelpers.connectToBackground(this.portName);
    });

    it('returns a promise', function () {
      expect(this.result).to.be.an.instanceOf(Promise);
    });

    it('creates a port with the given name', function () {
      expect(chrome.runtime.connect).to.have.been.calledOnce
        .and.calledWith({name: this.portName});
    });

    describe('when "background:connect" is triggered', function () {
      beforeEach(function () {
        this.listener = getPortMessageHandler(this.port);
        this.listener({name: 'background:connect'});
      });

      it('removes the listener', function () {
        expect(this.port.onMessage.removeListener).to.have.been.calledOnce
          .and.calledWith(this.listener);
      });

      it('resolves the returned promise with the port', function () {
        return expect(this.result).to.eventually.equal(this.port);
      });
    });
  });

  describe('injectContent', function () {
    beforeEach(function () {
      this.scriptName = 'such/content';
      this.result = PanelHelpers.injectContent(this.port, this.scriptName);
    });

    it('returns a promise', function () {
      expect(this.result).to.be.an.instanceOf(Promise);
    });

    it('posts a message to the background to register the content', function () {
      expect(this.port.postMessage).to.have.been.calledOnce
        .and.calledWith({
          name: 'register-content',
          contentTabId: this.tabId,
          file: this.scriptName
        });
    });

    describe('when "content:registered" is triggered', function () {
      beforeEach(function () {
        this.listener = getPortMessageHandler(this.port);
        this.listener({name: 'content:registered'});
      });

      it('removes the listener', function () {
        expect(this.port.onMessage.removeListener).to.have.been.calledOnce
          .and.calledWith(this.listener);
      });

      it('resolves the returned promise', function () {
        return this.result;
      });
    });
  });

  describe('injectScript', function () {
    beforeEach(function () {
      this.injectedScriptName = 'such/injected';
      this.returnedScript = '(function () {}())';
      this.server.respondWith('GET', this.injectedScriptName, [
        200,
        {'Content-Type': 'text/javascript'},
        this.returnedScript
      ]);
      this.result = PanelHelpers.injectScript(this.injectedScriptName);
      return this.server.respond();
    });

    it('returns a promise', function () {
      expect(this.result).to.be.an.instanceOf(Promise);
    });

    it('injects the returned script', function () {
      expect(chrome.devtools.inspectedWindow.eval).to.have.been.calledOnce
        .and.calledWith(this.returnedScript);
    });

    describe('after the script has been injected', function () {
      beforeEach(function () {
        this.evalCallback = chrome.devtools.inspectedWindow.eval.firstCall.args[1];
      });

      it('resolves the returned promise with the result when successful', function () {
        this.evalCallback('such-result', false);
        return expect(this.result).to.eventually.equal('such-result');
      });

      it('rejects the returned promise when the script throws an error', function (done) {
        this.evalCallback('such-error', true);
        return this.result.catch((response) => {
          expect(response).to.equal('such-error');
          done();
        });
      });
    });
  });

  describe('proxyEvents', function () {
    beforeEach(function () {
      this.emitter = new EventEmitter();
      this.sandbox.spy(this.emitter, 'emit');
      this.sandbox.spy(this.emitter, 'on');
      this.sandbox.spy(this.emitter, 'removeListener');
      this.result = PanelHelpers.proxyEvents(this.port, this.emitter);
      this.portHandler = getPortMessageHandler(this.port);
      this.emitterHandler = this.emitter.on.firstCall.args[1];
    });

    it('forwards tunnel:injected events from the emitter to the background', function () {
      this.emitter.emit('tunnel:injected', 'event', {payload: true});
      expect(this.port.postMessage).to.have.been.calledOnce
        .and.calledWith({
          name: 'tunnel:injected',
          event: 'event',
          payload: {payload: true}
        });
    });

    it('forwards tunnel:panel events from the port to the emitter', function () {
      this.portHandler({
        name: 'tunnel:panel',
        event: 'event',
        payload: {payload: true}
      });
      expect(this.emitter.emit).to.have.been.calledOnce
        .and.calledWith('event', {payload: true});
    });

    describe('when calling the returned function', function () {
      beforeEach(function () {
        this.result();
      });

      it('tears down the emitter listener', function () {
        expect(this.emitter.removeListener).to.have.been.calledOnce
          .and.calledWith('tunnel:injected', this.emitterHandler);
      });

      it('tears down the port listener', function () {
        expect(this.port.onMessage.removeListener).to.have.been.calledOnce
          .and.calledWith(this.portHandler);
      });
    });
  });

  describe('initializePanel', function () {
    beforeEach(function () {
      this.emitter = new EventEmitter();
      this.portName = 'suchPort';
      this.injected = 'such/injected';
      this.content = 'such/content';
      this.sandbox.stub(PanelHelpers, 'connectToBackground')
        .withArgs(this.portName).returns(Promise.resolve(this.port));
      this.sandbox.stub(PanelHelpers, 'proxyEvents');
      this.sandbox.stub(PanelHelpers, 'injectContent')
        .withArgs(this.port, this.content).returns(Promise.resolve());
      this.sandbox.stub(PanelHelpers, 'injectScript')
        .withArgs(this.injected).returns(Promise.resolve());
      this.result = PanelHelpers.initializePanel(this.portName, this.emitter, this.content, this.injected);
      return this.result;
    });

    it('calls all of the helpers in a reasonable default order', function () {
      expect(PanelHelpers.connectToBackground).to.have.been.calledOnce
        .and.calledWith(this.portName);
      expect(PanelHelpers.injectScript).to.have.been.calledOnce
        .and.calledWith(this.injected);
      expect(PanelHelpers.proxyEvents).to.have.been.calledOnce
        .and.calledWith(this.port, this.emitter)
        .and.calledAfter(PanelHelpers.connectToBackground);
      expect(PanelHelpers.injectContent).to.have.been.calledOnce
        .and.calledWith(this.port, this.content)
        .and.calledAfter(PanelHelpers.connectToBackground);
    });

    it('returns a promise that resolves to the port', function () {
      return expect(this.result).to.eventually.equal(this.port);
    });
  });
});
