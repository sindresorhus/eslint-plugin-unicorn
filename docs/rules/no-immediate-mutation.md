# Disallow immediate mutation after declaration

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Remove this comment, add more detailed description. -->

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
