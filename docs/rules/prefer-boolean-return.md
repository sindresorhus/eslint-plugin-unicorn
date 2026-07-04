# prefer-boolean-return

📝 Prefer directly returning boolean expressions over `if` statements.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule simplifies `if` statements whose branches, or adjacent following `return`, only return boolean literals.

When the positive condition is known to produce a boolean, it is returned directly. Other positive conditions are wrapped in `Boolean(...)` to preserve the original boolean return type. Negated forms use `!condition`.

This rule intentionally ignores the final condition in a consecutive series of early returns with the same boolean value. Keeping guard clauses together is usually clearer than rewriting only the last one.

## Examples

```js
// ❌
function isValid(value) {
	if (value > 0) {
		return true;
	}

	return false;
}

// ✅
function isValid(value) {
	return value > 0;
}
```

```js
// ❌
function hasItems(items) {
	if (items.length) {
		return true;
	}

	return false;
}

// ✅
function hasItems(items) {
	return Boolean(items.length);
}
```

```js
// ❌
function isInvalid(value) {
	if (value > 0) {
		return false;
	}

	return true;
}

// ✅
function isInvalid(value) {
	return !(value > 0);
}
```
