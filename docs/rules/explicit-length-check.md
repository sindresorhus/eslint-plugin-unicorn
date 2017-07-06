# Enforce explicitly comparing the `length` property of a value

Enforce explicitly checking the length of a value array in an `if` condition, rather than checking the truthiness of the length.

### Fail

```js
if (string.length) {}
if (array.length) {}
if (!array.length) {}
```

### Pass

```js
if (string.length > 0) {}
if (array.length > 0) {}
if (array.length !== 0) {}
if (array.length === 0) {}
```


## Zero comparisons

Enforce comparison with `!== 0` when checking for zero length.

### Fail

```js
if (string.length < 1) {}
```

### Pass

```js
if (array.length !== 0) {}
```


## Non-zero comparisons

You can define your preferred way of checking non-zero length by providing a `non-zero` option:

```js
{
	'unicorn/explicit-length-check': ['error', {
		'non-zero': 'not-equal'
	}]
}
```

The `non-zero` option can be configured with one of the following:

- `not-equal`
	- Enforces non-zero to be checked with: `array.length !== 0`
- `greater-than`
	- Enforces non-zero to be checked with: `array.length > 0`
- `greater-than-or-equal`
	- Enforces non-zero to be checked with: `array.length >= 1`

It can be auto-fixed.
