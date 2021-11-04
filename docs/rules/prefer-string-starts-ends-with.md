# Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

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
