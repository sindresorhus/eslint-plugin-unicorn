# Prefer `globalThis` over `window`, `self`, and `global`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule will enforce the use of `globalThis` over `window`, `self`, and `global`.

However, there are several exceptions that remain permitted:

1. Certain window/WebWorker-specific APIs, such as `window.innerHeight` and `self.postMessage`
2. Window-specific events, such as `window.addEventListener('resize')`

The complete list of permitted APIs can be found in the rule's [source code](../../rules/prefer-global-this.js).

## Examples

```js
window; // ❌
globalThis; // ✅
```

```js
window.foo; // ❌
globalThis.foo; // ✅
```

```js
window[foo]; // ❌
globalThis[foo]; // ✅
```

```js
global; // ❌
globalThis; // ✅
```

```js
global.foo; // ❌
globalThis.foo; // ✅
```

```js
const {foo} = window; // ❌
const {foo} = globalThis; // ✅
```

```js
window.location; // ❌
globalThis.location; // ✅

window.innerWidth; // ✅ (Window specific API)
window.innerHeight; // ✅ (Window specific API)
```

```js
window.navigator; // ❌
globalThis.navigator; // ✅
```

```js
self.postMessage('Hello'); // ✅ (Web Worker specific API)
self.onmessage = () => {}; // ✅ (Web Worker specific API)
```

```js
window.addEventListener('click', () => {}); // ❌
globalThis.addEventListener('click', () => {}); // ✅

window.addEventListener('resize', () => {}); // ✅ (Window specific event)
window.addEventListener('load', () => {}); // ✅ (Window specific event)
window.addEventListener('unload', () => {}); // ✅ (Window specific event)
```
