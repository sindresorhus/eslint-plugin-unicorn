# prefer-block-statement-over-iife

📝 Prefer block statements over IIFEs used only for scoping.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

IIFEs were commonly used to create a scope before JavaScript had block-scoped `let` and `const`. Use a block statement when the IIFE is only there for scoping.

This rule intentionally ignores IIFEs that use `return` from the IIFE body, accept arguments, use `async` or generators, or depend on function-specific behavior.

## Examples

```js
// ❌
(() => {
	const value = getValue();
	run(value);
})();

// ✅
{
	const value = getValue();
	run(value);
}
```

```js
// ❌
(function () {
	const value = getValue();
	run(value);
})();

// ✅
{
	const value = getValue();
	run(value);
}
```

```js
// ✅
const value = (() => {
	return getValue();
})();
```

```js
// ✅
(async () => {
	await run();
})();
```
