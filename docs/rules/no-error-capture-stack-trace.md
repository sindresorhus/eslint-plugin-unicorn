# Disallow unnecessary `Error.captureStackTrace(…)`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

It's unnecessary to call `Error.captureStackTrace(…)` inside subclass of builtin errors in constructor, since `Error` constructor will call it automatically.

## Examples

```js
class MyError extends Error {
	constructor() {
		// ❌
		Error.captureStackTrace(this, MyError);
		// ❌
		Error.captureStackTrace?.(this, MyError);
		// ❌
		Error.captureStackTrace(this, this.constructor);
		// ❌
		Error.captureStackTrace?.(this, this.constructor);
		// ❌
		Error.captureStackTrace(this, new.target);
		// ❌
		Error.captureStackTrace?.(this, new.target);
	}
}
```

