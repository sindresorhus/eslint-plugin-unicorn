# Prefer consistent types when spreading a ternary in an array literal

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When spreading a ternary in an array, we can use both `[]` and `''` as fallbacks, but it's better to have consistent types in both branches.

## Fail

```js
const array = [
	a,
	...(foo ? [b, c] : ''),
];
```

```js
const array = [
	a,
	...(foo ? 'bc' : []),
];
```

## Pass

```js
const array = [
	a,
	...(foo ? [b, c] : []),
];
```

```js
const array = [
	a,
	...(foo ? 'bc' : ''),
];
```
