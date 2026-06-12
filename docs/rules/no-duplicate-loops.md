# no-duplicate-loops

📝 Disallow duplicate loops in `for…of` loop headers.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using `.map()` or `.filter()` directly in a `for…of` loop header creates an intermediate array and then iterates over that array. Move the operation into the loop body so the original collection is only iterated once.

## Examples

```js
// ❌
for (const value of values.map(value => value.property)) {
	console.log(value);
}

// ✅
for (const value of values) {
	console.log(value.property);
}
```

```js
// ❌
for (const value of values.filter(value => value.isEnabled)) {
	console.log(value);
}

// ✅
for (const value of values) {
	if (value.isEnabled) {
		console.log(value);
	}
}
```

This rule intentionally only reports direct `.map()` and `.filter()` calls in `for…of` loop headers. More complex cases like precomputed aliases, consecutive loops, `Array.from(iterable)`, and `[...iterable]` are left to other rules or future improvements.
