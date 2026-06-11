# no-return-array-push

📝 Disallow returning the result of `Array#push()` with arguments.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#push()` returns the new length of the array, not the pushed value or the array. Returning that length is usually accidental when adding items.

If you want to push and exit, call `.push()` before `return`. If you intentionally want to return the length, return an explicit length expression instead.

This rule is syntax-only. It reports direct returned `.push(...)` calls with at least one argument and intentionally does not track array types. It also skips common stream-style `.push()` calls.

## Examples

```js
// ❌
function add(item) {
	return items.push(item);
}

// ✅
function add(item) {
	items.push(item);
	return;
}
```

```js
// ❌
const add = item => items.push(item);

// ✅
const add = item => {
	items.push(item);
};
```

```js
// ✅
function getNextLength(item) {
	return items.length + 1;
}
```
