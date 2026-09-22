# prefer-promise-static-methods

📝 Prefer `Promise.resolve()` and `Promise.reject()` over trivial `new Promise()` calls.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use `Promise.resolve()` and `Promise.reject()` when an inline executor immediately settles a new promise with a simple value. This avoids an unnecessary executor and makes the intent clearer.

Only executors consisting of one direct resolver call are checked. Calls, property reads, constructors, and other nontrivial expressions are ignored because moving their evaluation outside the executor could turn a rejected promise into a synchronous exception. `prefer-promise-try` covers the common `new Promise(resolve => resolve(fn()))` form.

The autofix includes identifiers, as in the original proposal. If an identifier is unbound or in its temporal dead zone, its read will throw synchronously after the fix instead of rejecting the promise. If it holds an existing promise, [`Promise.resolve()` may return that same promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve), while `new Promise()` creates a wrapper. Review such fixes where these differences matter.

TypeScript constructors with explicit type arguments are reported without an autofix for `resolve`, because `Promise.resolve<T>()` returns `Promise<Awaited<T>>`, which may differ from `Promise<T>`. The `reject` form remains autofixable.

## Examples

```js
// ❌
new Promise(resolve => resolve(value));

// ✅
Promise.resolve(value);
```

```js
// ❌
new Promise((resolve, reject) => {
	reject(error);
});

// ✅
Promise.reject(error);
```

Executors with other work and calls are left alone:

```js
new Promise(resolve => {
	setup();
	resolve(value);
});

new Promise(resolve => resolve(fn()));
```
