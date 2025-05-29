# Disallows using `Array.fill()` with **reference types** to prevent unintended shared references across array elements

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

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
