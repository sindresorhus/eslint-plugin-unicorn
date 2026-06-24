# prefer-promise-try

📝 Prefer `Promise.try()` over promise-wrapping boilerplate.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Promise.try()` is the standard way to run a callback that may either return a value, return a promise, or throw synchronously, and turn the result into a promise.

This rule reports older promise-wrapping boilerplate.

Autofix is only applied to `new Promise(resolve => resolve(fn()))` patterns where the timing stays synchronous. The fixed code keeps the call inside a callback so thrown errors still become promise rejections. `Promise.resolve().then(fn)` is reported but not fixed, since replacing it with `Promise.try(fn)` changes when `fn` runs.

## Examples

```js
// ❌
new Promise(resolve => resolve(fn()));

// ✅
Promise.try(() => fn());
```

```js
// ❌
new Promise(resolve => resolve(fn(argument)));

// ✅
Promise.try(() => fn(argument));
```

```js
// ❌
Promise.resolve().then(fn);

// ✅
Promise.try(fn);
```

Executors that do other work are intentionally ignored.

```js
// ✅
new Promise(resolve => {
	setup();
	resolve(fn());
});
```
