# Disallow `this` in non-class scope

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

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
