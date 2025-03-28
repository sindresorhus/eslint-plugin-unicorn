# Disallow using `.length` or `Infinity` as the `deleteCount` or `skipCount` argument of `Array#{splice,toSpliced}()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Remove this comment, add more detailed description. -->

When calling `Array#splice(start, deleteCount)` and `Array#toSpliced(start, skipCount)`, omitting the `deleteCount` and `skipCount` argument will delete or skip all elements after `start`. Passing `.length` explicitly or using `Infinity` is unnecessary.

## Examples

```js
// ❌
const foo = 'unicorn';

// ✅
const foo = '🦄';
```

```js
// ❌
function foo() {
	var replace = 'me';
	return replace;
}

// ✅
function foo() {
	return 'me';
}
```
