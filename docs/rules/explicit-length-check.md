# Enforce explicitly checking the length of an array

Enforce explicitly checking the length of an array in an `if` condition, rather than checking the truthiness of the length.

## Fail

```js
if (array.length) {}

if (!array.length) {}
```


## Pass

```js
if (array.length > 0) {}
if (array.length !== 0) {}

if (array.length === 0) {}
```
