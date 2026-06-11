# prefer-iterator-to-array

📝 Prefer `Iterator#toArray()` over temporary arrays from iterator spreads.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `Iterator#toArray()` over temporary arrays created with a single iterator spread.

`Iterator#toArray()` makes iterator-to-array conversion explicit and keeps iterator helper chains readable.

## Examples

```js
// ❌
const values = [...map.values()];

// ✅
const values = map.values().toArray();
```

```js
// ❌
const values = [...map.values().map(value => value * 2)];

// ✅
const values = map.values().map(value => value * 2).toArray();
```

This rule is intentionally narrow. It does not report arbitrary iterables because not every iterable has `Iterator#toArray()`.

```js
// ✅
const values = [...set];
```

Calls like `.values()`, `.keys()`, `.entries()`, and `.matchAll()` are reported as suggestions because custom methods with those names may return non-iterator iterables.

Iterable-accepting contexts are intentionally ignored because they do not need an array.

```js
// ✅
new Set([...map.values()]);
```

Mixed arrays and multi-spread arrays are intentionally ignored.

```js
// ✅
const values = [first, ...map.values()];

// ✅
const values = [...foo, ...bar];
```
