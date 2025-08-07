# Enforce consistent brace style for `case` clauses

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

1. Forbid braces for empty clauses.
1. Enforce braces for non-empty clauses.

## Fail

```js
switch (foo) {
	case 1: {
	}
	case 2: {
		doSomething();
		break;
	}
}
```

```js
switch (foo) {
	case 1:
		doSomething();
		break;
}
```

## Pass

```js
switch (foo) {
	case 1: {
		doSomething();
		break;
	}
}
```

## Options

Type: `string`\
Default: `'always'`

- `'always'` (default)
  - Always report when clause is not a `BlockStatement`.
- `'avoid'`
  - Only allow braces when there are variable declaration or function declaration which requires a scope.

The following cases are considered valid:

```js
// eslint unicorn/switch-case-braces: ["error", "avoid"]
switch (foo) {
	case 1:
		doSomething();
		break;
}
```

```js
// eslint unicorn/switch-case-braces: ["error", "avoid"]
switch (foo) {
	case 1: {
		const bar = 2;
		doSomething(bar);
		break;
	}
}
```

The following case is considered invalid:

```js
// eslint unicorn/switch-case-braces: ["error", "avoid"]
switch (foo) {
	case 1: {
		doSomething();
		break;
	}
}
```
