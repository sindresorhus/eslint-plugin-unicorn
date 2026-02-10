# Disallow unnecessary `.toArray()` on iterators

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Iterator.prototype.toArray()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/toArray) converts an iterator to an array. However, this conversion is unnecessary in the following cases:

- The following builtins accept an iterable, so converting to an array first is unnecessary:

  - `Map` constructor
  - `WeakMap` constructor
  - `Set` constructor
  - `WeakSet` constructor
  - `TypedArray` constructor
  - `Array.from(…)`
  - `TypedArray.from(…)`
  - `Promise.{all,allSettled,any,race}(…)`
  - `Object.fromEntries(…)`

- `for…of` can iterate over any iterable, so converting to an array first is unnecessary.

- `yield*` can delegate to any iterable, so converting to an array first is unnecessary.

- Some `Array` methods also exist on `Iterator` with the same semantics, so converting to an array to call them is unnecessary:

  - `.every()`
  - `.find()`
  - `.forEach()`
  - `.reduce()`
  - `.some()`

This rule does not flag `.filter()`, `.map()`, or `.flatMap()` because their `Iterator` versions return iterators, not arrays, so the semantics differ.

## Examples

```js
// ❌
const set = new Set(iterator.toArray());

// ✅
const set = new Set(iterator);
```

```js
// ❌
const results = await Promise.all(iterator.toArray());

// ✅
const results = await Promise.all(iterator);
```

```js
// ❌
for (const item of iterator.toArray());

// ✅
for (const item of iterator);
```

```js
// ❌
function * foo() {
	yield * iterator.toArray();
}

// ✅
function * foo() {
	yield * iterator;
}
```

```js
// ❌
iterator.toArray().every(fn);

// ✅
iterator.every(fn);
```

```js
// ✅ — `.filter()` returns an array on Array but an iterator on Iterator
iterator.toArray().filter(fn);
```
