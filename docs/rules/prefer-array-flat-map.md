# Prefer `.flatMap(…)` over `.map(…).flat()`

[`Array#flatMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) performs [`Array#map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [`Array#flat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) in one step.

This rule is fixable.


## Fail

```js
[1, 2, 3].map(i => [i]).flat();
[].concat(...foo.map((i) => i))
```


## Pass

```js
[1, 2, 3].flatMap(i => [i]);
[1, 2, 3].map(i => [i]).foo().flat();
```
