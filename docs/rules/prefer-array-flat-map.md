# Prefer `.flatMap(…)` over `.map(…).flat()`

[`Array#flatMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) performs [`Array#map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [`Array#flat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) in one step.

This rule is fixable.


## Fail

```js
const foo = bar.map(element => unicorn(element)).flat();
```

```js
const foo = bar.map(element => unicorn(element)).flat(1);
```


## Pass

```js
const foo = bar.flatMap(element => unicorn(element));
```

```js
const foo = bar.map(element => unicorn(element)).flat(2);
```

```js
const foo = bar.map(element => unicorn(element)).foo().flat();
```

```js
const foo = bar.flat().map(element => unicorn(element));
```

## Related rules

- [unicorn/prefer-array-flat](./prefer-array-flat.md)
