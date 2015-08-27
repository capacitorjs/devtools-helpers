'use strict';

import BackgroundHelpers from 'src/background-helpers';

describe('BackgroundHelpers', function () {

  beforeEach(function () {
    this.sandbox.stub(chrome, 'runtime', {
      onConnect: {
        addListener: this.sandbox.stub(),
        removeListener: this.sandbox.stub()
      }
    });
    this.sandbox.stub(chrome, 'tabs', {
      executeScript: this.sandbox.stub()
    });
    this.registry = BackgroundHelpers.newRegistry();
    this.newPort = function (tabId) {
      return {
        onMessage: {
          addListener: this.sandbox.stub(),
          removeListener: this.sandbox.stub()
        },
        onDisconnect: {
          addListener: this.sandbox.stub()
        },
        postMessage: this.sandbox.stub(),
        sender: {
          tab: {
            id: tabId
          }
        }
      };
    };
    this.panelId = 'very-panel-much-id';
    this.panelPort = this.newPort(this.panelId);
    this.contentId = 'such-content-very-id';
    this.contentPort = this.newPort(this.contentId);
  });

  describe('newPanelListener', function () {
    beforeEach(function () {
      this.listener = BackgroundHelpers.newPanelListener(this.registry);
    });

    describe('when called with the "register-content" event"', function () {
      beforeEach(function () {
        this.fileName = 'wow.cbz';
        this.listener({
          name: 'register-content',
          contentTabId: this.contentId,
          file: this.fileName
        }, this.panelPort);
      });

      it('registers the connection between the panel and content', function () {
        expect(this.registry.panelToContent[this.panelId]).to.equal(this.contentId);
        expect(this.registry.contentToPanel[this.contentId]).to.equal(this.panelId);
      });

      it('injects the given content script', function () {
        expect(chrome.tabs.executeScript).to.have.been.calledOnce
          .and.calledWith(this.contentId, {file: this.fileName});
      });
    });

    describe('when called with the "tunnel:injected" event', function () {
      beforeEach(function () {
        this.registry.panelToContent[this.panelId] = this.contentId;
        this.registry.contentConnections[this.contentId] = this.contentPort;
        this.message = {
          name: 'tunnel:injected',
          such: 'doge'
        };
        this.listener(this.message, this.panelPort);
      });

      it('forwards the event to the relevant content script', function () {
        expect(this.contentPort.postMessage).to.have.been.calledOnce
          .and.calledWith(this.message);
      });
    });
  });

  describe('newContentListener', function () {
    beforeEach(function () {
      this.registry.contentToPanel[this.contentId] = this.panelId;
      this.registry.panelConnections[this.panelId] = this.panelPort;
      this.listener = BackgroundHelpers.newContentListener(this.registry);
    });

    it('posts "content:registered" to the panel when "register" is triggered', function () {
      this.listener({name: 'register'}, this.contentPort);
      expect(this.panelPort.postMessage).to.have.been.calledOnce
        .and.calledWith({name: 'content:registered'});
    });

    it('forwards "tunnel:panel" events to the relevant panel', function () {
      this.listener({name: 'tunnel:panel'}, this.contentPort);
      expect(this.panelPort.postMessage).to.have.been.calledOnce
        .and.calledWith({name: 'tunnel:panel'});
    });
  });

  describe('registerConnection', function () {
    beforeEach(function () {
      this.connections = {};
      this.idCache = {};
      this.listener = this.sandbox.stub();
      BackgroundHelpers.registerConnection(this.panelPort, this.connections, this.idCache, this.listener);
    });

    it('caches the port', function () {
      expect(this.connections[this.panelId]).to.equal(this.panelPort);
    });

    it('attaches the provided listener to the port', function () {
      expect(this.panelPort.onMessage.addListener).to.have.been.calledOnce
        .and.calledWith(this.listener);
    });

    it('informs the port that the background has connected.', function () {
      expect(this.panelPort.postMessage).to.have.been.calledOnce
        .and.calledWith({name: 'background:connect'});
    });

    describe('when the port disconnects', function () {
      beforeEach(function () {
        this.idCache[this.panelId] = true;
        this.onDisconnect = this.panelPort.onDisconnect.addListener.firstCall.args[0];
        this.onDisconnect();
      });

      it('removes the listener', function () {
        expect(this.panelPort.onMessage.removeListener).to.have.been.calledOnce
          .and.calledWith(this.listener);
      });

      it('removes the port from the connection cache', function () {
        expect(this.connections[this.panelId]).not.to.exist;
      });

      it('removes the port from the id cache', function () {
        expect(this.idCache[this.panelId]).not.to.exist;
      });
    });
  });

  describe('handleConnections', function () {
    beforeEach(function () {
      this.portName = 'name';
      this.portHandler = this.sandbox.stub();
      this.unusedHandler = this.sandbox.stub();
      this.result = BackgroundHelpers.handleConnections({
        [this.portName]: this.portHandler,
        unused: this.unusedHandler
      });
      this.listener = chrome.runtime.onConnect.addListener.firstCall.args[0];
    });

    it('registers a listener that calls a handler based on a ports name', function () {
      const port = {name: this.portName};
      this.listener(port);
      expect(this.portHandler).to.have.been.calledOnce
        .and.calledWith(port);
      expect(this.unusedHandler).not.to.have.been.called;
    });

    it('returns a function that removes the listener', function () {
      this.result();
      expect(chrome.runtime.onConnect.removeListener).to.have.been.calledOnce
        .and.calledWith(this.listener);
    });
  });

  describe('initializeBackground', function () {
    beforeEach(function () {
      this.panelPortName = 'panel-port';
      this.contentPortName = 'content-port';
      this.panelListener = this.sandbox.stub();
      this.contentListener = this.sandbox.stub();
      this.port = {port: true};
      this.registry.panelConnections.panelConnection = true;
      this.registry.contentConnections.contentConnection = true;
      this.registry.panelToContent.panelId = true;
      this.registry.contentToPanel.contentId = true;
      this.sandbox.stub(BackgroundHelpers, 'newRegistry').returns(this.registry);
      this.sandbox.stub(BackgroundHelpers, 'newPanelListener')
        .withArgs(this.registry).returns(this.panelListener);
      this.sandbox.stub(BackgroundHelpers, 'newContentListener')
        .withArgs(this.registry).returns(this.contentListener);
      this.sandbox.stub(BackgroundHelpers, 'handleConnections');
      this.sandbox.stub(BackgroundHelpers, 'registerConnection');
      this.result = BackgroundHelpers.initializeBackground(this.panelPortName, this.contentPortName);
      this.handlers = BackgroundHelpers.handleConnections.firstCall.args[0];
    });

    it('returns the registry', function () {
      expect(this.result).to.equal(this.registry);
    });

    it('creates a handler for the panel port', function () {
      this.handlers[this.panelPortName](this.port);
      expect(BackgroundHelpers.registerConnection).to.have.been.calledOnce
        .and.calledWith(this.port, this.registry.panelConnections, this.registry.panelToContent, this.panelListener);
    });

    it('creates a handler for the content port', function () {
      this.handlers[this.contentPortName](this.port);
      expect(BackgroundHelpers.registerConnection).to.have.been.calledOnce
        .and.calledWith(this.port, this.registry.contentConnections, this.registry.contentToPanel, this.contentListener);
    });
  });
});
