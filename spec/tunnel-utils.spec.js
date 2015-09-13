'use strict';

import TunnelUtils from 'src/tunnel-utils';

describe('TunnelUtils', function () {
  describe('tunnelEvent', function () {
    beforeEach(function () {
      this.callback = this.sandbox.stub();
      this.targetWindow = document.createElement('iframe');
      this.tunneled = TunnelUtils.tunnelEvents(this.targetWindow, 'tunnel', this.callback);
    });

    it('forwards "tunnel:injected" events from the content to the emitter', function () {
      const message = {name: 'tunnel'};
      this.tunneled({
        data: message,
        source: this.targetWindow
      });
      expect(this.callback).to.have.been.calledOnce
        .and.calledWith(message);
    });

    it('ignores messages not from the source window', function () {
      this.tunneled({
        data: {name: 'tunnel'},
        source: {}
      });
      expect(this.callback).not.to.have.been.called;
    });

    it('ignores messages without a name of "tunnel:injected"', function () {
      this.tunneled({
        data: {name: 'notunnel'},
        source: {}
      });
      expect(this.callback).not.to.have.been.called;
    });
  });
});
