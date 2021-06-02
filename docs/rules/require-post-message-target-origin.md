# Enforce using the targetOrigin argument with `Window.postMessage()`

When calling [`window.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) without `targetOrigin` argument, message can't be received by any window.

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
