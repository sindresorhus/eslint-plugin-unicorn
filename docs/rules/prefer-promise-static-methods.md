# prefer-promise-static-methods

📝 Prefer `Promise.resolve()` and `Promise.reject()` over trivial `new Promise()` calls.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer static methods when a `new Promise()` executor only calls `resolve` or `reject` with no argument or a simple value.

Calls, property reads, constructors, and other nontrivial expressions are ignored because they may throw outside the executor. `prefer-promise-try` covers `resolve(fn())`.

Identifier fixes can turn an unbound or temporal dead zone read into a synchronous throw. [`Promise.resolve()` may reuse an existing promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve) instead of wrapping it.

TypeScript `new Promise<T>()` calls that resolve are reported without a fix: `Promise.resolve<T>()` returns `Promise<Awaited<T>>`, which may differ from `Promise<T>`. The `reject` form remains fixable.

## Examples

```js
// ❌
new Promise(resolve => resolve(value));

// ✅
Promise.resolve(value);
```

```js
// ❌
new Promise((resolve, reject) => reject(error));

// ✅
Promise.reject(error);
```
