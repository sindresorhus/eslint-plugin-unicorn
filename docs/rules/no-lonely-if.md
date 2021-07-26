# Disallow `if` statements as the only statement in `if` blocks without `else`

This rule adds onto the built-in [`no-lonely-if`](https://eslint.org/docs/rules/no-lonely-if) rule, which only forbids `if` statements in `else`, not in `if`. It is recommended to use `unicorn/no-lonely-if` together with the core ESLint `no-lonely-if` rule.

This rule is fixable.

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
