# Disallow unreadable IIFEs

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[IIFE](https://en.wikipedia.org/wiki/Immediately_invoked_function_expression) with parenthesized arrow function body is considered unreadable.

## Examples

```js
// ❌
const foo = (bar => (bar ? bar.baz : baz))(getBar());

// ✅
const bar = getBar();
const foo = bar ? bar.baz : baz;

// ✅
const getBaz = bar => (bar ? bar.baz : baz);
const foo = getBaz(getBar());
```

```js
// ❌
const foo = ((bar, baz) => ({bar, baz}))(bar, baz);
```

```js
// ✅
const foo = (bar => {
	return bar ? bar.baz : baz;
})(getBar());
```
