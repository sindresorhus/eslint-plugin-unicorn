# require-post-message-target-origin

📝 Enforce using the `targetOrigin` argument with `window.postMessage()`.

🚫 Disabled by default.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule requires an explicit target origin for single-argument calls to [`Window#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage). If you omit the target origin, the browser only delivers the message to a window with the sender's origin. Use `'/'` to make that behavior explicit, or specify the expected origin of a cross-origin window.

When TypeScript provides call signatures, the rule reports a call if any signature has a `targetOrigin` parameter. Methods such as `Worker#postMessage()`, `MessagePort#postMessage()`, and `BroadcastChannel#postMessage()` have no such parameter.

Without call signatures, the rule checks the global `window`, `window.parent`, `window.top`, `window.opener`, `document.defaultView`, and `.contentWindow`. Untyped aliases such as `target.postMessage()` are ignored.

## Examples

```js
// ❌
window.postMessage(data);

// ✅ - Deliver only to the sender's origin
window.postMessage(data, '/');
```

```js
// ❌ - Sending to iframe without specifying origin
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage(data);

// ✅ - Specify the exact origin you expect
iframe.contentWindow.postMessage(data, 'https://expected-iframe-origin.com');
```
