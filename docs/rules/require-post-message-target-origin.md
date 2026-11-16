# require-post-message-target-origin

📝 Enforce using the `targetOrigin` argument with `window.postMessage()`.

🚫 Disabled by default.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks calls to [`Window#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) written in dot notation. It reports calls with just a message and calls with an inline options object that omits `targetOrigin`. It skips options passed by reference and object literals with spreads, computed keys it cannot resolve, or a `__proto__` key.

If you omit the target origin, the browser only delivers the message to a window with the sender's origin. Use `'/'` to make that behavior explicit, or specify the expected origin of a cross-origin window.

When TypeScript provides call signatures, the rule looks for a signature whose second parameter is named `targetOrigin`. For inline options objects, each possible method type must have known signatures, and all signatures must come from TypeScript's standard library. Methods such as `Worker#postMessage()`, `MessagePort#postMessage()`, and `BroadcastChannel#postMessage()` have no `targetOrigin` parameter.

Without call signatures, the rule checks the global `window`, `window.parent`, `window.top`, `window.opener`, `document.defaultView`, and `.contentWindow`. Untyped aliases such as `target.postMessage()` are ignored.

The editor suggestion adds `'/'` as the second argument or as the `targetOrigin` property. When TypeScript provides call signatures, each possible method type must have a window signature, and all overloads must come from TypeScript's standard library. The rule withholds the suggestion for options objects wrapped in TypeScript syntax such as `satisfies`, because the type can restrict their properties. For cross-origin delivery, enter the expected origin yourself.

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
iframe.contentWindow.postMessage(data, {transfer: [port]});

// ✅ - Specify the exact origin you expect
iframe.contentWindow.postMessage(data, {targetOrigin: 'https://expected-iframe-origin.com', transfer: [port]});
```
