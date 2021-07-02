# Disallow useless array length check

- `Array#some()` returns `false` on empty array, there is no need to check the array is empty.
- `Array#every()` returns `true` on empty array, there is no need to check the array is not empty.

We only check `.length === 0`, `.length !== 0`, and `.length > 0`, these zero and non-zero length check styles are allowed in [`unicorn/explicit-length-check`](./explicit-length-check.md#options) rule, it is recommended to use them together.

This rule is fixable.

## Fail

```js
if (array.length === 0 || array.every(Boolean));
```

```js
if (array.length !== 0 && array.some(Boolean));
```

```js
if (array.length > 0 && array.some(Boolean));
```

```js
const isAllTrulyOrEmpty = array.length === 0 || array.every(Boolean);
```

## Pass

```js
if (array.every(Boolean));
```

```js
if (array.some(Boolean));
```

```js
const isAllTrulyOrEmpty = array.every(Boolean);
```

```js
const isAllTrulyNonEmptyArray = array.length > 0 && array.every(Boolean);
```

```js
const isEmptyArrayOrAllTruly = array.length === 0 || array.some(Boolean);
```
