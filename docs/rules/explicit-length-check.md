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

## Empty Comparisons

Enforce length comparison with `!== 0` when checking for an empty array.

### Fail

```js
if (string.length < 1) {}
```

### Pass

```js
if (array.length !== 0) {}
```

## Non Zero Comparisons

You can define your preferred way of checking non zero length by providing an option:
```js
{
  "unicorn/explicit-length-check": ["error", {
    "not-empty": "notEmptyOption"
  }]
}
```
where `"notEmptyOption"` can be one of the following:
- `"ne"` (not-equal)
	- this option makes sure that non zero is checked with: `array.length !== 0`
- `"gt"` (greater-than)
	- this option makes sure that non zero is checked with: `array.length > 0`
- `"gte"` (greater-than or equal-to)
	- this option makes sure that non zero is checked with: `array.length >= 1`

