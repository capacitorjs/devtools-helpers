'use strict';

import {EventEmitter} from 'events';
import InjectedHelpers from 'src/injected-helpers';

describe('InjectedHelpers', function () {
  describe('connectToContent', function () {
    beforeEach(function () {
      this.emitter = new EventEmitter();
      this.sandbox.stub(window, 'addEventListener');
      this.sandbox.stub(window, 'removeEventListener');
      this.sandbox.stub(window, 'postMessage');
      this.sandbox.stub(this.emitter, 'on');
      this.sandbox.stub(this.emitter, 'removeListener');
      this.sandbox.stub(this.emitter, 'emit');
      this.result = InjectedHelpers.connectToContent(this.emitter);
      this.fromContent = window.addEventListener.firstCall.args[1];
      this.toContent = this.emitter.on.firstCall.args[1];
    });

    it('registers "tunnel:devtools" events on the emitter', function () {
      expect(this.emitter.on).to.have.been.calledOnce
        .and.calledWith('tunnel:devtools', this.toContent);
    });

    it('registers "message" events on the window', function () {
      expect(window.addEventListener).to.have.been.calledOnce
        .and.calledWith('message', this.fromContent);
    });

    it('sends "tunnel:devtools" messages to the content script', function () {
      this.toContent('event', {payload: true});
      expect(window.postMessage).to.have.been.calledOnce
        .and.calledWith({
          name: 'tunnel:devtools',
          event: 'event',
          payload: {payload: true}
        }, '*');
    });

    it('forwards "tunnel:injected" events from the content to the emitter', function () {
      this.fromContent({
        data: {
          name: 'tunnel:injected',
          event: 'event',
          payload: {payload: true}
        },
        source: window
      });
      expect(this.emitter.emit).to.have.been.calledOnce
        .and.calledWith('event', {payload: true});
    });

    it('ignores messages not from the source window', function () {
      this.fromContent({
        data: {
          name: 'tunnel:injected'
        },
        source: {}
      });
      expect(this.emitter.emit).not.to.have.been.called;
    });

    it('ignores messages without a name of "tunnel:injected"', function () {
      this.fromContent({
        data: {
          name: 'not:forwarded'
        },
        source: {}
      });
      expect(this.emitter.emit).not.to.have.been.called;
    });

    it('unregisters the events when the returned function is called', function () {
      this.result();
      expect(window.removeEventListener).to.have.been.calledOnce
        .and.calledWith('message', this.fromContent);
      expect(this.emitter.removeListener).to.have.been.calledOnce
        .and.calledWith('tunnel:devtools', this.toContent);
    });
  });
});
