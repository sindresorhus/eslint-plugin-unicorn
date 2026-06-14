# no-return-array-push

📝 Disallow using the return value of `Array#push()` and `Array#unshift()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#push()` and `Array#unshift()` return the new length of the array, not the added value or the array. Using that length is usually accidental when adding items.

If you want to add an item and exit, call `.push()` or `.unshift()` before `return`. If you intentionally want to use the length, use an explicit `.length` expression after the mutation.

This rule is syntax-only. It reports used `.push(...)` and `.unshift(...)` return values with at least one argument and intentionally does not track array types. It also skips common stream-style `.push()` calls.

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
// ❌
const length = items.unshift(item);

// ✅
items.unshift(item);
const length = items.length;
```

```js
// ✅
function getNextLength(item) {
	items.push(item);
	return items.length;
}
```
