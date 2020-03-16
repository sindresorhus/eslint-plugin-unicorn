# Prefer `String#slice()` over `String#substr()` and `String#substring()`

[`String#substr()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr) and [`String#substring()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring) are the two lesser known legacy ways to slice a string. It's better to use [`String#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice) as it's a more popular option with clearer behavior that has a consistent [`Array` counterpart](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice).

This rule is partly fixable.

## Fail

```js
foo.substr(start, length);
foo.substring(indexStart, indexEnd);
```

## Pass

```js
foo.slice(beginIndex, endIndex);
```
