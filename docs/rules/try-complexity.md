# try-complexity

📝 Limit the complexity of `try` blocks.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Large `try` blocks can make it unclear which operation is expected to throw. This rule uses the same cyclomatic complexity signals as ESLint's [`complexity`](https://eslint.org/docs/latest/rules/complexity) rule, but only for the `try` block itself.

This rule counts decision points, not lines or statements. A `try` block with multiple straight-line statements has a complexity of `1`.

## Examples

```js
// ❌
try {
	if (condition) {
		doSomething();
	}
} catch (error) {
	handleError(error);
}

// ✅
try {
	doSomething();
	doSomethingElse();
} catch (error) {
	handleError(error);
}
```

```js
// ❌
try {
	const value = condition ? a : b;
} catch (error) {
	handleError(error);
}

// ✅
const value = condition ? a : b;

try {
	doSomething(value);
} catch (error) {
	handleError(error);
}
```

## Options

### max

Type: `number`\
Default: `1`

The maximum allowed complexity of a `try` block.

```js
/* eslint unicorn/try-complexity: ["error", {"max": 2}] */
// ✅
try {
	if (condition) {
		doSomething();
	}
} catch (error) {
	handleError(error);
}
```
