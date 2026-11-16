# require-post-message-target-origin

📝 Enforce using the `targetOrigin` argument with `window.postMessage()`.

🚫 Disabled by default.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Require an explicit target origin for [`Window#postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage). The rule checks calls in dot notation with just a message or with inline options that lack `targetOrigin`. It skips options variables and objects with spreads, unresolved keys, or `__proto__`.

Use `'/'` to make the browser's same-origin default explicit. For cross-origin delivery, specify the expected origin.

## Examples

```js
// ❌
window.postMessage(data);

// ✅
window.postMessage(data, '/');
```

```js
const iframe = document.querySelector('iframe');

// ❌
iframe.contentWindow.postMessage(data, {transfer: [port]});

// ✅
iframe.contentWindow.postMessage(data, {targetOrigin: 'https://example.com', transfer: [port]});
```

## Type information

Without call signatures, the rule checks the global `window`, its `parent`, `top`, and `opener` properties, `document.defaultView`, and `.contentWindow`.

With signatures, the rule looks for a second parameter named `targetOrigin`. The inline options check and the editor suggestion require known signatures from TypeScript's standard library for every possible method type. For the suggestion, every type must also have a `targetOrigin` signature.

The editor can add `'/'` as the second argument or as `targetOrigin` in a plain object literal. Options wrapped in TypeScript syntax such as `satisfies` get a diagnostic without an edit.
