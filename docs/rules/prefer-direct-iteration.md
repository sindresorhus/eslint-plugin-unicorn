# prefer-direct-iteration

📝 Prefer direct iteration over default iterator method calls.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some built-ins expose their default iterator through both `[Symbol.iterator]()` and a named method. For example, `Map#entries()` is the same iterator as `Map#[Symbol.iterator]()`, and `Array#values()` is the same iterator as `Array#[Symbol.iterator]()`.

When the result is immediately consumed as an iterable, the named method is redundant.

This rule reports:

- `.entries()` for `Map`, `FormData`, and `URLSearchParams`
- `.values()` for `Array`, typed arrays, and `Set`
- `.keys()` for `Set`

It intentionally does not report unknown receivers, or methods that are not equivalent to the default iterator, such as `Array#entries()`, `Map#values()`, or `Set#entries()`.

## Examples

```js
// ❌
const map = new Map();
for (const entry of map.entries()) {}
```

```js
// ✅
const map = new Map();
for (const entry of map) {}
```

```js
// ❌
const array = [1, 2, 3];
const values = [...array.values()];
```

```js
// ✅
const array = [1, 2, 3];
const values = [...array];
```

```js
// ❌
const map = new Map();
const copy = new Map(map.entries());
```

```js
// ✅
const map = new Map();
const copy = new Map(map);
```

```js
// ✅ — `Array#entries()` yields `[index, value]` pairs, while arrays iterate values by default
for (const entry of array.entries()) {}
```

```js
// ✅ — unknown receiver
for (const item of collection.values()) {}
```
