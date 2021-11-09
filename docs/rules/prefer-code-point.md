# Prefer `String#codePointAt(…)` over `String#charCodeAt(…)` and `String.fromCodePoint(…)` over `String.fromCharCode(…)`

Unicode is better supported in [`String#codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt) and [`String.fromCodePoint()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCodePoint).

- [Different between `String.fromCodePoint()` and `String.fromCharCode()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCodePoint#compared_to_fromcharcode)

## Fail

```js
const unicorn = '🦄'.charCodeAt(0).toString(16);
```

```js
const unicorn = String.fromCharCode(0x1f984);
```

## Pass

```js
const unicorn = '🦄'.codePointAt(0).toString(16);
```

```js
const unicorn = String.fromCodePoint(0x1f984);
```
