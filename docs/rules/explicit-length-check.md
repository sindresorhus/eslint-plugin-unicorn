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
