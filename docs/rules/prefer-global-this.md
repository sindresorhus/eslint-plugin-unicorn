# Prefer `globalThis` over `window`, `self`, and `global`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule will enforce the use of `globalThis` over `window`, `self`, and `global`.

However, some window-specific APIs are still allowed (e.g. `window.innerWidth`, `window.innerHeight`). You can find the list of APIs in the [source code](../../rules/prefer-global-this.js) of this rule.

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
global[foo]; // ❌
globalThis[foo]; // ✅
```

```js
const { foo } = window; // ❌
const { foo } = globalThis; // ✅
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
self.postMessage('Hello') // ✅ (Web Worker specific API)
self.onmessage = () => {} // ✅ (Web Worker specific API)
```

```js
window.addEventListener("click", () => {}); // ❌
globalThis.addEventListener("click", () => {}); // ✅

window.addEventListener("resize", () => {}); // ✅ (Window specific event)
window.addEventListener("load", () => {}); // ✅ (Window specific event)
window.addEventListener("unload", () => {}); // ✅ (Window specific event)
```
