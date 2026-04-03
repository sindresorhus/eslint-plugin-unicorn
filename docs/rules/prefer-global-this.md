# prefer-global-this

📝 Prefer `globalThis` over `window`, `self`, and `global`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule will enforce the use of `globalThis` over `window`, `self`, and `global`.

However, there are several exceptions that remain permitted:

1. Certain window-specific APIs, such as `window.innerHeight`
2. Window-specific events, such as `window.addEventListener('resize')`
3. Computed property access on `window`, such as `window[foo]`

The complete list of permitted APIs can be found in the rule's [source code](../../rules/prefer-global-this.js).

## Examples

```js
// ❌
window;

// ✅
globalThis;
```

```js
// ❌
window.foo;

// ✅
globalThis.foo;
```

```js
// ❌
global;

// ✅
globalThis;
```

```js
// ❌
global.foo;

// ✅
globalThis.foo;
```

```js
// ❌
const {foo} = window;

// ✅
const {foo} = globalThis;
```

```js
// ❌
window.navigator;

// ✅
globalThis.navigator;
```

```js
// ❌
window.location;

// ✅
globalThis.location;
```

```js
// ✅
window.innerWidth;

// ✅
window.innerHeight;
```

```js
// ❌
window.addEventListener('click', () => {});

// ✅
globalThis.addEventListener('click', () => {});

// ✅
window.addEventListener('resize', () => {});

// ✅
window.addEventListener('load', () => {});

// ✅
window.addEventListener('unload', () => {});
```
