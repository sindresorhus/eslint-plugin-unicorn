# Prefer `String#{trimStart,trimEnd}()` over `String#{trimLeft,trimRight}()`

[`String#trimLeft()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimLeft) and [`String#trimRight()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimRight) are alias of [`String#trimStart()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimStart) and [`String#trimEnd()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimEnd)

This rule is fixable.

## Fail

```js
const foo = bar.trimStart();
const foo = bar.trimEnd();
```

## Pass

```js
const foo = bar.trimLeft();
const foo = bar.trimRight();
```
