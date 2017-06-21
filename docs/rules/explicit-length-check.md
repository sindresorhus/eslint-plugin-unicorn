# Enforce explicitly comparing the `length` property of a value

Enforce explicitly checking the length of a value array in an `if` condition, rather than checking the truthiness of the length.

## Fail

```js
if (string.length) {}
if (array.length) {}
if (!array.length) {}
```


## Pass

```js
if (string.length > 0) {}
if (array.length > 0) {}
if (array.length !== 0) {}
if (array.length === 0) {}
```

## Options

You can set options for `empty` and `not-empty` comparisons like this:

```json
"unicorn/explicit-length-check": ["error", {
  "empty": "emptyOption",
  "not-empty": "notEmptyOption"
}]
```

where:
- `"emptyOption"` can be one of the following:
	- `"eq"` (equal)
		- this option makes sure that empty is checked with: `a.length === 0 `
	- `"lt"` (less-than)
		- this option makes sure that empty is checked with: `a.length < 1`

- `"notEmptyOption"` can be one of the following:
	- `"ne"` (not-equal)
		- this option makes sure that empty is checked with: `a.length !== 0`
	- `"gt"` (greater-than)
		- this option makes sure that empty is checked with: `a.length > 0`
	- `"gte"` (greater-than or equal-to)
		- this option makes sure that empty is checked with: `a.length >= 1`
