# Prefer `switch` over multiple `else-if`

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

A switch statement is easier to read than multiple if statements with simple equality comparisons.

This rule is partly fixable.

## Fail

```js
if (foo === 1) {
	// 1
} else if (foo === 2) {
	// 2
} else if (foo === 3) {
	// 3
} else {
	// default
}
```

## Pass

```js
if (foo === 1) {
	// 1
} else if (foo === 2) {
	// 2
}
```

```js
switch (foo) {
	case 1: {
		// 1
		break;
	}
	case 2: {
		// 2
		break;
	}
	case 3: {
		// 3
		break;
	}
	default: {
		// default
	}
}
```

## Options

Type: `object`

#### `minimumCases`

Type: `integer`\
Minimum: `2`\
Default: `3`

The minimum number of cases before reporting.

The `default` branch doesn't count. Multiple comparisons on the same `if` block is considered one case.

Examples:

```js
// eslint unicorn/prefer-switch: ["error", {"minimumCases": 4}]
if (foo === 1) {}
else if (foo === 2) {}
else if (foo === 3) {}

// Passes, only 3 cases.
```

```js
// eslint unicorn/prefer-switch: ["error", {"minimumCases": 4}]
if (foo === 1) {}
else if (foo === 2) {}
else if (foo === 3) {}
else {}

// Passes, only 3 cases.
```

```js
// eslint unicorn/prefer-switch: ["error", {"minimumCases": 4}]
if (foo === 1) {}
else if (foo === 2 || foo === 3) {}
else if (foo === 4) {}

// Passes, only 3 cases.
```

```js
// eslint unicorn/prefer-switch: ["error", {"minimumCases": 2}]
if (foo === 1) {}
else if (foo === 2) {}

// Fails
```

#### `emptyDefaultCase`

Type: `string`\
Default: `'no-default-comment'`

To avoid conflict with the [`default-case`](https://eslint.org/docs/rules/default-case) rule, choose the fix style you prefer:

- `'no-default-comment'` (default)
	Insert `// No default` comment after last case.
- `'do-nothing-comment'`
	Insert `default` case and add `// Do nothing` comment.
- `'no-default-case'`
	Don't insert default case or comment.

```js
if (foo === 1) {}
else if (foo === 2) {}
else if (foo === 3) {}
```

Fixed

```js
/* eslint unicorn/prefer-switch: ["error", { "emptyDefaultCase": "no-default-comment" }] */
switch (foo) {
	case 1: {
		break;
	}
	case 2: {
		break;
	}
	case 3: {
		break;
	}
	// No default
}
```

```js
/* eslint unicorn/prefer-switch: ["error", { "emptyDefaultCase": "do-nothing-comment" }] */
switch (foo) {
	case 1: {
		break;
	}
	case 2: {
		break;
	}
	case 3: {
		break;
	}
	default:
		// Do nothing
}
```

```js
/* eslint unicorn/prefer-switch: ["error", { "emptyDefaultCase": "no-default-case" }] */
switch (foo) {
	case 1: {
		break;
	}
	case 2: {
		break;
	}
	case 3: {
		break;
	}
}
```
