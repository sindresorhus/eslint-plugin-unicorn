# Prefer `.find(…)` over the first element from `.filter(…)`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

[`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) breaks the loop as soon as it finds a match and doesn't create a new array.

This rule is fixable unless default values are used in declaration or assignment.

## Fail

```js
const item = array.filter(x => isUnicorn(x))[0];
```

```js
const item = array.filter(x => isUnicorn(x)).shift();
```

```js
const [item] = array.filter(x => isUnicorn(x));
```

```js
[item] = array.filter(x => isUnicorn(x));
```

## Pass

```js
const item = array.find(x => isUnicorn(x));
```

```js
item = array.find(x => isUnicorn(x));
```
