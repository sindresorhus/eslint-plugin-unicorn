# Prefer the use of `String#slice()` instead of `String#substr()` or `String#substring()`

Prefer a convention of using [`String#slice()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/slice) instead of [`String#substr()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/substr) or [`String#substring()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring). `String#slice()` has clearer behavior and has a counterpart with arrays. It is also better to be consistent. Anything that can be done with `String#substr()` or `String#substring()` can be done with `String#slice()`.

Read more in [this Stack Overflow question](http://stackoverflow.com/questions/2243824/what-is-the-difference-between-string-slice-and-string-substring)

## Fail

```js
const foo = bar.substr(1, 2);
const baz = quux.substring(1, 3);
```

## Pass

```js
const foo = bar.slice(1, 3);
```
