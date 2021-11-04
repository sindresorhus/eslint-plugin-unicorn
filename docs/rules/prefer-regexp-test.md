# Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

When you want to know whether a pattern is found in a string, use [`RegExp#test()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test) instead of [`String#match()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match) and [`RegExp#exec()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec).

## Fail

```js
if (string.match(/unicorn/)) {}
```

```js
if (/unicorn/.exec(string)) {}
```

```vue
<template>
	<div v-if="/unicorn/.exec(string)">Vue</div>
</template>
```

## Pass

```js
if (/unicorn/.test(string)) {}
```

```vue
<template>
	<div v-if="/unicorn/.test(string)">Vue</div>
</template>
```
