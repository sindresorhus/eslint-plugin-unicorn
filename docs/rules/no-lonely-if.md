# no-lonely-if

📝 Disallow `if` statements as the only statement in `if` blocks without `else`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule adds onto the built-in [`no-lonely-if`](https://eslint.org/docs/rules/no-lonely-if) rule, which only disallows `if` statements in `else`, not in `if`. It is recommended to use `unicorn/no-lonely-if` together with the core ESLint `no-lonely-if` rule.

## Examples

```js
// ❌
if (foo) {
	if (bar) {
		// …
	}
}

// ✅
if (foo && bar) {
	// …
}
```

```js
// ❌
if (foo) {
	// …
} else if (bar) {
	if (baz) {
		// …
	}
}

// ✅
if (foo) {
	// …
} else if (bar && baz) {
	// …
}
```

```js
// ✅
if (foo) {
	// …
} else if (bar) {
	if (baz) {
		// …
	}
} else {
	// …
}
```

```js
// ✅
// Built-in rule `no-lonely-if` case https://eslint.org/docs/rules/no-lonely-if
if (foo) {
	// …
} else {
	if (bar) {
		// …
	}
}
```
