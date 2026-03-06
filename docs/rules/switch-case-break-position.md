# Enforce consistent `break`/`return`/`continue`/`throw` position in `case` clauses

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Enforce that terminating statements (`break`, `return`, `continue`, `throw`) appear inside the block statement of a `case` clause, not after it.

This can happen when refactoring — for example, removing an `if` wrapper but leaving the `break` outside the braces.

## Examples

```js
// ❌
switch(foo) {
	case 1: {
		doStuff();
	}
	break;
}

// ✅
switch(foo) {
	case 1: {
		doStuff();
		break;
	}
}
```
