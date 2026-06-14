# no-unreadable-for-of-expression

📝 Disallow unreadable iterable expressions in `for…of` and `for await…of` loop headers.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Keep `for…of` and `for await…of` loop headers easy to scan. Complex iterable expressions should be moved to a named variable before the loop.

This rule allows identifiers, property chains, array literals, simple calls, and `Object.keys()`, `Object.values()`, or `Object.entries()` calls with a simple argument.

Direct `.map()` and `.filter()` calls that would be reported by [`no-duplicate-loops`](./no-duplicate-loops.md) are intentionally ignored by this rule.

Native iterator helper chains are considered complex in loop headers.

## Examples

```js
// ❌
for (const item of getItems(createArgument(seed))) {
	console.log(item);
}

// ✅
const argument = createArgument(seed);
for (const item of getItems(argument)) {
	console.log(item);
}
```

```js
// ❌
for (const key of Object.keys(Object.fromEntries(entries))) {
	console.log(key);
}

// ✅
const object = Object.fromEntries(entries);
for (const key of Object.keys(object)) {
	console.log(key);
}
```

```js
// ✅
for (const item of getItems(argument)) {
	console.log(item);
}
```

```js
// ✅
for (const item of items) {
	console.log(item);
}
```

```js
// ✅
for (const value of Object.values(object)) {
	console.log(value);
}
```
