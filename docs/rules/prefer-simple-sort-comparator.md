# prefer-simple-sort-comparator

📝 Prefer a simple comparison function for `Array#sort()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A comparison function passed to [`Array#sort()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) (or [`Array#toSorted()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted)) is often written as a verbose chain of `if` statements or ternaries that compares two values with `>` and `<` and returns `1`, `-1`, and `0`. When the two sides are mirror images of each other (for example `a` and `b`, or `a.foo` and `b.foo`), the whole thing can be replaced with a single subtraction.

This rule only offers a suggestion, never an autofix, because the verbose form also works for strings, whereas subtraction only works for numbers. Switch to `a.localeCompare(b)` instead when sorting strings.

Multi-key comparators (comparing different properties as tiebreakers), `Math.random()` based shuffles, and operands using optional chaining are intentionally not reported.

## Examples

```js
// ❌
array.sort((a, b) => {
	if (a > b) {
		return 1;
	}

	if (a < b) {
		return -1;
	}

	return 0;
});

// ❌
array.sort((a, b) => a > b ? 1 : -1);

// ✅
array.sort((a, b) => a - b);
```

```js
// ❌
array.sort((a, b) => a.foo > b.foo ? -1 : 1);

// ✅
array.sort((a, b) => b.foo - a.foo);
```

```js
// ✅ Sorting strings
array.sort((a, b) => a.localeCompare(b));

// ✅ Multi-key comparator, not reported
array.sort((a, b) => a.foo - b.foo || a.bar - b.bar);
```
