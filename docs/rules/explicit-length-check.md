# Enforce explicitly comparing the `length` property of a value

Enforce explicitly checking the length of an array in an `if` condition or ternary and enforce the comparison style.

This rule is fixable.

## Zero comparisons

Enforce comparison with `=== 0` when checking for zero length.

### Fail

```js
if (!foo.length) {}
```

```js
if (foo.length == 0) {}
```

```js
if (foo.length < 1) {}
```

```js
if (0 === foo.length) {}
```

```js
if (0 == foo.length) {}
```

```js
if (1 > foo.length) {}
```

```js
// Negative style is forbid too
if (!(foo.length > 0)) {}
```

### Pass

```js
if (foo.length === 0) {}
```

```js
const unicorn = foo.length === 0 ? 1 : 2;
```

## Non-zero comparisons

Enforce comparison with `> 0` when checking for non-zero length.

### Fail

```js
if (foo.length !== 0) {}
```

```js
if (foo.length != 0) {}
```

```js
if (foo.length >= 1) {}
```

```js
if (0 !== foo.length) {}
```

```js
if (0 != foo.length) {}
```

```js
if (0 < foo.length) {}
```

```js
if (1 <= foo.length) {}
```

```js
// Negative style is forbid too
if (!(foo.length === 0)) {}
```

### Pass

```js
if (foo.length > 0) {}
```

```js
const unicorn = foo.length > 0 ? 1 : 2;
```

### Options

You can define your preferred way of checking non-zero length by providing a `non-zero` option (`greater-than` by default):

```js
{
	'unicorn/explicit-length-check': [
		'error',
		{
			'non-zero': 'not-equal'
		}
	]
}
```

The `non-zero` option can be configured with one of the following:

- `greater-than` (default)
	- Enforces non-zero to be checked with: `foo.length > 0`
- `not-equal`
	- Enforces non-zero to be checked with: `foo.length !== 0`
- `greater-than-or-equal`
	- Enforces non-zero to be checked with: `foo.length >= 1`
