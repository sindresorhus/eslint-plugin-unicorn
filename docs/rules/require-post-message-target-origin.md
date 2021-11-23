# Enforce using the `targetOrigin` argument with `window.postMessage()`

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*

When calling [`window.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) without the `targetOrigin` argument, the message cannot be received by any window.

This rule cannot distinguish between `window.postMessage()` and other calls like [`Worker#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage), [`MessagePort#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage), [`Client#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Client/postMessage), and [`BroadcastChannel#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel/postMessage). Use on your own risk.

## Fail

```js
window.postMessage(message);
```

## Pass

```js
window.postMessage(message, 'https://example.com');
```

```js
window.postMessage(message, '*');
```
