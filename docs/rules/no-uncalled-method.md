# no-uncalled-method

📝 Disallow referencing methods without calling them.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Forgetting to call a method returns the method function instead of the intended value. This is usually a bug in conditions, returns, and assignments.

This rule checks known `Array` and `String` methods when the receiver can be identified from syntax, type annotations, parser type information, conventional variable names like `array` and `string`, or `const` aliases of those.

## Examples

```js
// ❌
const sorted = array.sort;
```

```js
// ✅
const sorted = array.sort();
```

```js
// ❌
function normalize(string) {
	return string.toLowerCase;
}
```

```js
// ✅
function normalize(string) {
	return string.toLowerCase();
}
```

```js
// ✅
array.sort.call(array);
```

```js
// ✅
typeof string.toLowerCase === 'function';
```
