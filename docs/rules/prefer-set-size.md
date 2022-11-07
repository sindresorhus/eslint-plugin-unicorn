# Prefer use `Set#size` instead of convert it to Array first

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer use `Set#size` directly instead of convert it to an array, and use `.length` of the array.

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
