# Prefer `.find(…)` over the first element from `.filter(…)`

[`Array#find`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) breaks the loop as soon as it finds a match.

This rule is fixable.

## Fail

```js
const item = array.filter(x => x === '🦄')[0];
```

```js
const item = array.filter(x => x === '🦄').shift();
```

## Pass

```js
const item = array.find(x => x === '🦄');
```
