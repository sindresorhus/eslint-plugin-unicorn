# Prefer `.find(…)` over the first element from `.filter(…)`

[`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) breaks the loop as soon as it finds a match and doesn't create a new array.

This rule is fixable unless default values are used in declaration or assignment.

## Fail

```js
const item = array.filter(x => x === '🦄')[0];
```

```js
const item = array.filter(x => x === '🦄').shift();
```

```js
const [item] = array.filter(x => x === '🦄');
```

```js
[item] = array.filter(x => x === '🦄');
```

## Pass

```js
const item = array.find(x => x === '🦄');
```

```js
item = array.find(x => x === '🦄');
```
