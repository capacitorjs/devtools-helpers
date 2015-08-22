# capacitor-panel-helpers

Helper methods for devtools development.  
Requires an event-emitter, such as [stream-bus](https://github.com/capacitorjs/stream-bus.git) to forward events.
Use with capacitor-content-helpers, capacitor-background-helpers, and capacitor-injected-helpers. For a complete example, 
see capacitor-devtools-skeleton


##Api

### connectToBackground(bus: EventEmitter, initialContentFile: String) : Promise

Connect to the background page, injecting the given content file and
forwarding tunneled events along the bus. It will forward messages matching the following:
```js
{
    name: 'tunnel:devtools',
    event: String, // the name of the event to forward
    payload: Object, String, Array // the argument for the event
}
```

The returned promise will resolve when the content has been injected successfully.

### injectScript(scriptFile: String)

Inject the provided scriptFile into the inspected window.  The provided path must be relative to the chrome extension.