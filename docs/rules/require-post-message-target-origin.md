# require-post-message-target-origin

📝 Enforce using the `targetOrigin` argument with `window.postMessage()`.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Specifying the `targetOrigin` argument with [`window.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) is a security best practice. It ensures that sensitive messages are only delivered to the intended recipient, preventing accidentally sending data to a window with an unexpected origin due to navigation or redirects.

This rule cannot distinguish between `window.postMessage()` and other calls like [`Worker#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage), [`MessagePort#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage), [`Client#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Client/postMessage), and [`BroadcastChannel#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel/postMessage), which don't have a `targetOrigin` parameter.

## Examples

```js
// ❌ - Missing targetOrigin, message could be intercepted
window.postMessage(sensitiveData);

// ✅ - Explicit target origin prevents security issues
window.postMessage(sensitiveData, 'https://trusted-domain.com');
```

```js
// ❌
window.postMessage({token: authToken});

// ✅ - Always specify the target origin
window.postMessage({token: authToken}, 'https://api.example.com');
```

```js
// ✅ - '*' is acceptable when sending non-sensitive public data
window.postMessage({publicData: 'hello'}, '*');
```

```js
// ❌ - Sending to iframe without specifying origin
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage(data);

// ✅ - Specify the exact origin you expect
iframe.contentWindow.postMessage(data, 'https://expected-iframe-origin.com');
```
