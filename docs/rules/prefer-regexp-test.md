# Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

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
