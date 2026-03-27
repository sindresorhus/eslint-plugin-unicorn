# Disallow unnecessary `.toArray()` on iterators

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

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
  - `Object.fromEntries(…)`

- `for…of` can iterate over any iterable, so converting to an array first is unnecessary.

- `yield*` can delegate to any iterable, so converting to an array first is unnecessary.

- `Promise.{all,allSettled,any,race}(…)` accept an iterable, so `.toArray()` is unnecessary. However, removing it can change a synchronous throw into an asynchronous rejection when iteration fails, so these cases are reported as **suggestions** rather than autofixes.

- The spread operator (`...`) works on any iterable, so converting to an array before spreading is unnecessary:

  - `[...iterator.toArray()]` → `[...iterator]`
  - `call(...iterator.toArray())` → `call(...iterator)`

- Some `Array` methods also exist on `Iterator`, so converting to an array to call them is unnecessary:

  - `.every()`
  - `.find()`
  - `.forEach()`
  - `.reduce()`
  - `.some()`

However, `Array` callbacks receive additional arguments (e.g., the 3rd `array` argument) that `Iterator` callbacks do not, so removing `.toArray()` can change behavior if the callback uses those arguments. These cases are reported as **suggestions** rather than autofixes.

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
const items = [...iterator.toArray()];

// ✅
const items = [...iterator];
```

```js
// ❌
call(...iterator.toArray());

// ✅
call(...iterator);
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
