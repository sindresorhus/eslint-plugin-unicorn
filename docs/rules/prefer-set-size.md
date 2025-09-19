# Prefer using `Set#size` instead of `Array#length`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using `Set#size` directly instead of first converting it to an array and then using its `.length` property.

## Examples

```js
// ❌
function isUnique(array) {
	return [...new Set(array)].length === array.length;
}

// ✅
function isUnique(array) {
	return new Set(array).size === array.length;
}
```
