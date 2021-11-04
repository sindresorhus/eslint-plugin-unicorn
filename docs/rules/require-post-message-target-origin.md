# Enforce using the `targetOrigin` argument with `window.postMessage()`

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

When calling [`window.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) without the `targetOrigin` argument, the message cannot be received by any window.

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
