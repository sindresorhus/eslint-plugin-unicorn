# Disallow `if` statements as the only statement in `if` blocks without `else`

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

This rule adds onto the built-in [`no-lonely-if`](https://eslint.org/docs/rules/no-lonely-if) rule, which only disallows `if` statements in `else`, not in `if`. It is recommended to use `unicorn/no-lonely-if` together with the core ESLint `no-lonely-if` rule.

## Fail

```js
if (foo) {
	if (bar) {
		// …
	}
}
```

```js
if (foo) {
	// …
} else if (bar) {
	if (baz) {
		// …
	}
}
```

## Pass

```js
if (foo && bar) {
	// …
}
```

```js
if (foo) {
	// …
} else if (bar && baz) {
	// …
}
```

```js
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
// Built-in rule `no-lonely-if` case https://eslint.org/docs/rules/no-lonely-if
if (foo) {
	// …
} else {
	if (bar) {
		// …
	}
}
```
