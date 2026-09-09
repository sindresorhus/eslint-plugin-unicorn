# prefer-array-from-async

📝 Prefer `Array.fromAsync()` over array accumulation loops.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `Array.fromAsync()` over simple loops that only accumulate values into an array.

`Array.fromAsync(iterable)` directly creates an array from an async iterable, sync iterable, or array-like value. It is clearer than manually creating and filling an array in a loop.

This rule reports a `const` or `let` empty-array declaration immediately followed by a simple `for…of` or `for await…of` loop whose only statement pushes into the array. The loop must use one identifier binding, and mapped expressions must be explicitly awaited.

Ordinary `for…of` loops are limited to inputs known to yield primitives. Without type information, this covers statically known strings and array literals of primitives; array literals with spreads are skipped. Full TypeScript type information also enables strings, arrays, readonly arrays, and tuples of primitives. Arrays referenced through variable declarations are supported only when initialized by a single-use `const` array literal; aliases are skipped. Unknown values, object or promise elements, and custom iterables are also skipped. Syntax-only TypeScript uses the JavaScript checks.

Unlike an ordinary loop, `Array.fromAsync()` awaits synchronous elements before mapping and therefore yields before the first mapper call. This can change shared-state reads, so ordinary loops receive suggestions, while `for await…of` loops remain automatically fixable. The rule ignores `Promise.all()` because it may map concurrently.

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

The arrow ensures `readFile` receives only the path; `Array.fromAsync(paths, readFile)` would also pass the index.
