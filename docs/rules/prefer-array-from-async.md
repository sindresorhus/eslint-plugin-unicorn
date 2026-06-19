# prefer-array-from-async

📝 Prefer `Array.fromAsync()` over `for await…of` array accumulation.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `Array.fromAsync()` over simple `for await…of` loops that only accumulate values into an array.

`Array.fromAsync(iterable)` directly creates an array from an async iterable, sync iterable, or array-like value. It is clearer than manually creating an empty array, iterating with `for await…of`, and pushing one value per iteration.

This rule only reports adjacent `const` or `let` empty-array declarations followed by a `for await…of` loop with a single identifier binding and a body that is only a single `result.push(…)` expression. Mapped values are only reported when the pushed value is explicitly awaited, because `Array.fromAsync()` awaits mapper results.

## Examples

```js
// ❌
const result = [];
for await (const element of iterable) {
	result.push(element);
}

// ✅
const result = await Array.fromAsync(iterable);
```

```js
// ❌
const result = [];
for await (const element of iterable) {
	result.push(await transform(element));
}

// ✅
const result = await Array.fromAsync(iterable, element => transform(element));
```

```js
// ✅
const result = [];
for await (const element of iterable) {
	result.push(transform(element));
}
```
