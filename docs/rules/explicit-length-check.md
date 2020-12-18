# Enforce explicitly comparing the `length` property of a value

Enforce explicitly checking the length of a value array in an `if` condition, rather than checking the truthiness of the length, and enforce comparison style.

This rule is fixable.

## Zero comparisons

Enforce comparison with `=== 0` when checking for zero length.
### Fail

```js
const unicorn = foo.length < 1 ? 1 : 2;
```

```js
if (!(foo.length > 0)) {}
```

```js
if (!foo.length) {}
```

```js
if (0 === foo.length) {}
```

### Pass

```js
const unicorn = foo.length === 0 ? 1 : 2;
```

```js
if (foo.length === 0) {}
```

## Non-zero comparisons

By default, enforce comparison with `> 0` when checking for non-zero length.

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
const unicorn = foo.length ? 1 : 2;
```

```js
if (!(foo.length === 0)) {}
```

### Pass

```js
const unicorn = foo.length > 0 ? 1 : 2;
```

```js
if (foo.length > 0) {}
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


