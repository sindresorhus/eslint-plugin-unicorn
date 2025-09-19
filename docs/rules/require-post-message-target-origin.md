# Enforce using the `targetOrigin` argument with `window.postMessage()`

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When calling [`window.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) without the `targetOrigin` argument, the message cannot be received by any window.

This rule cannot distinguish between `window.postMessage()` and other calls like [`Worker#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage), [`MessagePort#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage), [`Client#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Client/postMessage), and [`BroadcastChannel#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel/postMessage). Use on your own risk.

## Examples

```js
// ❌
window.postMessage(message);
```

```js
// ✅
window.postMessage(message, 'https://example.com');
```

```js
// ✅
window.postMessage(message, '*');
```
