# Disallows using `Array.fill()` with **reference types** (objects, arrays, functions, Maps, Sets, RegExp literals, etc.) to prevent unintended shared references across array elements. Encourages `Array.from()` or explicit iteration for creating independent instances

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

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
