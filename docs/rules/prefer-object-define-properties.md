# prefer-object-define-properties

📝 Prefer `Object.defineProperties()` over multiple `Object.defineProperty()` calls.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer [`Object.defineProperties()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties) when defining multiple properties on the same object.

This rule only checks adjacent `Object.defineProperty()` expression statements with the same target. `Reflect.defineProperty()` is intentionally ignored because it returns a boolean instead of throwing and there is no `Reflect.defineProperties()` equivalent.

## Examples

```js
// ❌
Object.defineProperty(foo, 'bar', {
	value: 1,
	writable: true,
});
Object.defineProperty(foo, 'baz', {
	value: 2,
	writable: true,
});

// ✅
Object.defineProperties(foo, {
	bar: {
		value: 1,
		writable: true,
	},
	baz: {
		value: 2,
		writable: true,
	},
});
```
