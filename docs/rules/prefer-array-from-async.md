# prefer-array-from-async

📝 Prefer `Array.fromAsync()` over array accumulation loops.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `Array.fromAsync()` over simple loops that only accumulate values into an array.

`Array.fromAsync(iterable)` directly creates an array from an async iterable, sync iterable, or array-like value. It is clearer than manually creating an empty array, iterating with `for await…of`, and pushing one value per iteration.

This rule only reports adjacent `const` or `let` empty-array declarations followed by a supported `for…of` or `for await…of` loop with a single identifier binding and a body that is only a single `result.push(…)` expression. Mapped values are only reported when the pushed value is explicitly awaited, because `Array.fromAsync()` awaits mapper results.

Ordinary `for…of` loops are reported only for explicitly awaited mappings over known primitive inputs. Without type information, this includes statically known strings and array literals containing primitive values, including constant arrays used only as the loop input. Arrays with spreads or other references are skipped rather than attempting to track mutations and aliases.

With TypeScript type information enabled, this also includes strings, arrays, readonly arrays, and tuples whose element types are exclusively primitive. Syntax-only TypeScript parsing uses the same static checks as JavaScript. Unknown inputs, object or promise elements, and custom iterables are not reported.

`Array.fromAsync()` awaits synchronous input elements before passing them to the mapper, unlike ordinary `for…of`. Both approaches await each mapper result before processing the next element. This rule does not transform `Promise.all()`, which can run mappings concurrently.

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

```js
// ❌
const paths = ['a.txt', 'b.txt'];
const contents = [];
for (const path of paths) {
	contents.push(await readFile(path));
}

// ✅
const paths = ['a.txt', 'b.txt'];
const contents = await Array.fromAsync(paths, path => readFile(path));
```

The arrow function preserves the original arguments. Passing `readFile` directly would also pass the element index as its second argument.
