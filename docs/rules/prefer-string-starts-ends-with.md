# Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`

Prefer [`String#startsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith) and [`String#endsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith) over using a regex with `/^foo/` or `/foo$/`.

This rule is fixable.

## Fail

```js
const foo = /^bar/.test(baz);
```

```js
const foo = /bar$/.test(baz);
```

## Pass

```js
const foo = baz.startsWith('bar');
```

```js
const foo = baz.endsWith('bar');
```

```js
const foo = /^bar/i.test(baz);
```
