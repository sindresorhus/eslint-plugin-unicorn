# Disallow `if` statements as the only statement in `if` blocks without `else`

This rule adds on to the built-in [no-lonely-if](https://eslint.org/docs/rules/no-lonely-if) rule, which only forbid `if` statements in `else`. Does not enforce for `if` statements in `if`.

This rule is fixable.

## Fail

```js
if (foo) {
	if (bar) {
		// ...
	}
}
```

```js
if (foo) {
	// ...
} else if (bar) {
	if (baz) {
		// ...
	}
}
```

## Pass

```js
if (foo && bar) {
	// ...
}
```

```js
if (foo) {
	// ...
} else if (bar && baz) {
	// ...
}
```

```js
if (foo) {
	// ...
} else if (bar) {
	if (baz) {
		// ...
	}
} else {
	// ...
}
```

```js
// Built-in rule `no-lonely-if` case https://eslint.org/docs/rules/no-lonely-if
if (foo) {
	// ...
} else {
	if (bar) {
		// ...
	}
}
```
