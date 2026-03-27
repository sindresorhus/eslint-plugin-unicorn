# no-useless-error-capture-stack-trace

📝 Disallow unnecessary `Error.captureStackTrace(…)`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Calling [`Error.captureStackTrace(…)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/captureStackTrace) inside the constructor of a built-in `Error` subclass is unnecessary, since the `Error` constructor calls it automatically.

## Examples

```js
// ❌
class MyError extends Error {
	constructor() {
		Error.captureStackTrace(this, MyError);
	}
}
```

```js
// ❌
class MyError extends Error {
	constructor() {
		Error.captureStackTrace?.(this, MyError);
	}
}
```

```js
// ❌
class MyError extends Error {
	constructor() {
		Error.captureStackTrace(this, this.constructor);
	}
}
```

```js
// ❌
class MyError extends Error {
	constructor() {
		Error.captureStackTrace?.(this, this.constructor);
	}
}
```

```js
// ❌
class MyError extends Error {
	constructor() {
		Error.captureStackTrace(this, new.target);
	}
}
```

```js
// ❌
class MyError extends Error {
	constructor() {
		Error.captureStackTrace?.(this, new.target);
	}
}
```
