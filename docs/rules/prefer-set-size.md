# Prefer using `Set#size` instead of `Array#length`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using `Set#size` directly instead of first converting it to an array and then using its `.length` property.

## Fail

```js
function isUnique(array) {
	return [...new Set(array)].length === array.length;
}
```

## Pass

```js
function isUnique(array) {
	return new Set(array).size === array.length;
}
```
