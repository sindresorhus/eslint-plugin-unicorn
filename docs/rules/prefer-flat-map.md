# Prefer `.flatMap()` over `.map(...).flat()`.

[`.flatMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) performs [`.map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [`.flat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) in one step.

This rule is fixable.

## Fail

```js
[1,2,3].map(i => [i]).flat();
```

## Pass

```js
[1,2,3].flatMap(i => [i]);
[1,2,3].map(i => [i]).foo().flat();
```
