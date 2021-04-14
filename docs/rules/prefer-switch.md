# Prefer `switch` over multiple `else-if`

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

### `options`

Type: `object`

#### `minimumCases`

Type: `integer`\
Minimum value: `2`\
Default value: `3`

The minimum cases to report, the `default` branch doesn't count, multiple comparisons on same `if` block is considered one case.

Examples:

```js
// eslint unicorn/prefer-switch: ["error", {"minimumCases": 4}]
if (foo === 1) {}
else (foo === 2) {}
else (foo === 3) {}

// Passes, only 3 cases.
```

```js
// eslint unicorn/prefer-switch: ["error", {"minimumCases": 4}]
if (foo === 1) {}
else (foo === 2) {}
else (foo === 3) {}
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
