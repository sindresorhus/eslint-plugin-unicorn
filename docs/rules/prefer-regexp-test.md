# Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`

When you want to know whether a pattern is found in a string, use [`RegExp#test()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test) instead of [`String#match()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match) and [`RegExp#exec()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec).

This rule is fixable.

## Fail

```js
if (string.match(/unicorn/)) {}
```

```js
if (/unicorn/.exec(string)) {}
```

## Pass

```js
if (/unicorn/.test(string)) {}
```
