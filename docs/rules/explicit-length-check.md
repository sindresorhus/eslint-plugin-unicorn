# Enforce explicitly comparing the `length` property of a value

Enforce explicitly checking the length of an object and enforce the comparison style.

This rule is fixable.

## Zero comparisons

Enforce comparison with `=== 0` when checking for zero length.

### Fail

```js
const isEmpty = !foo.length;
```

```js
const isEmpty = foo.length == 0;
```

```js
const isEmpty = foo.length < 1;
```

```js
const isEmpty = 0 === foo.length;
```

```js
const isEmpty = 0 == foo.length;
```

```js
const isEmpty = 1 > foo.length;
```

```js
// Negative style is forbidden too
const isEmpty = !(foo.length > 0);
```

### Pass

```js
const isEmpty = foo.length === 0;
```

## Non-zero comparisons

Enforce comparison with `> 0` when checking for non-zero length.

### Fail

```js
const isNotEmpty = foo.length !== 0;
```

```js
const isNotEmpty = foo.length != 0;
```

```js
const isNotEmpty = foo.length >= 1;
```

```js
const isNotEmpty = 0 !== foo.length;
```

```js
const isNotEmpty = 0 != foo.length;
```

```js
const isNotEmpty = 0 < foo.length;
```

```js
const isNotEmpty = 1 <= foo.length;
```

```js
// Negative style is forbidden too
const isNotEmpty = !(foo.length === 0);
```

```js
if (foo.length || bar.length) {}
```

```js
const unicorn = foo.length ? 1 : 2;
```

```js
while (foo.length) {}
```

```js
do {} while (foo.length);
```

```js
for (; foo.length; ) {};
```

### Pass

```js
const isNotEmpty = foo.length > 0;
```

```js
if (foo.length > 0 || bar.length > 0) {}
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
