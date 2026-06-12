# no-useless-else

📝 Disallow `else` after a statement that exits.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When an `if` branch always exits, its `else` branch is unnecessary. Moving the `else` body after the `if` makes the control flow flatter.

This rule checks simple control flow only. It reports branches that exit with `return`, `throw`, `break`, or `continue`, including nested `if` statements where both branches exit.

The autofix is conservative and skips cases where removing the `else` could affect scoped declarations, comments, or automatic semicolon insertion.

## Examples

```js
// ❌
if (foo) {
	return;
} else {
	bar();
}

// ✅
if (foo) {
	return;
}

bar();
```

```js
// ❌
if (foo) {
	throw new Error();
} else if (bar) {
	baz();
}

// ✅
if (foo) {
	throw new Error();
}

if (bar) {
	baz();
}
```
