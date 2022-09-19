# Enforce consistent brace style for `case` clauses

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

1. Forbid braces for empty clauses.
1. Enforce braces for non-empty clauses.

## Fail

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
