# require-post-message-target-origin

📝 Enforce using the `targetOrigin` argument with `window.postMessage()`.

🚫 Disabled by default.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks single-argument calls to [`Window#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) written in dot notation. If you omit the target origin, the browser only delivers the message to a window with the sender's origin. Use `'/'` to make that behavior explicit, or specify the expected origin of a cross-origin window.

When TypeScript provides call signatures, the rule reports a call if any signature names its second parameter `targetOrigin`. Methods such as `Worker#postMessage()`, `MessagePort#postMessage()`, and `BroadcastChannel#postMessage()` have no such parameter.

Without call signatures, the rule checks the global `window`, `window.parent`, `window.top`, `window.opener`, `document.defaultView`, and `.contentWindow`. Untyped aliases such as `target.postMessage()` are ignored.

The editor suggestion inserts `'/'` for these window receivers when call signatures are unavailable. With type information, each possible method type must have a window signature, and all overloads must come from TypeScript's standard library. For cross-origin delivery, enter the expected origin yourself.

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
