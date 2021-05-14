# Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`

Prefer [`String#startsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith) and [`String#endsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith) over using a regex with `/^foo/` or `/foo$/`.

This rule is fixable.

Note: the autofixed code will throw an exception when the value being tested is not a string. Several safer but more verbose automatic suggestions are provided for this situation.

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
const foo = baz?.startsWith('bar');
```

```js
const foo = (baz ?? '').startsWith('bar');
```

```js
const foo = String(baz).startsWith('bar');
```

```js
const foo = /^bar/i.test(baz);
```
