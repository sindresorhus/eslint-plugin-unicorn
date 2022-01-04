# Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

Prefer [`String#startsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith) and [`String#endsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith) over using a regex with `/^foo/` or `/foo$/`.

This rule is fixable, unless the matching object is known not a string.

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
