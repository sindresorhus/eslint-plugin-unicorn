# prefer-promise-with-resolvers

📝 Prefer `Promise.withResolvers()` when extracting resolver functions from `new Promise()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Promise.withResolvers()` is the standard way to create a promise together with its `resolve` and `reject` functions.

This rule only reports the old boilerplate pattern where a `new Promise()` executor copies resolver functions to outer variables and does nothing else.

## Examples

```js
// ❌
let resolve;
const promise = new Promise(resolve_ => {
	resolve = resolve_;
});

// ✅
const {promise, resolve} = Promise.withResolvers();
```

```js
// ❌
let fulfill;
let fail;
const deferredPromise = new Promise((resolve, reject) => {
	fulfill = resolve;
	fail = reject;
});

// ✅
const {promise: deferredPromise, resolve: fulfill, reject: fail} = Promise.withResolvers();
```

Executors that do setup work are intentionally ignored.

```js
// ✅
const promise = new Promise(resolve => {
	functionThatPotentiallyThrows();
	resolve();
});
```
