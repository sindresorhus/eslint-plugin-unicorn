# prefer-iterator-to-array-at-end

📝 Prefer moving `.toArray()` to the end of iterator helper chains.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Prefer moving `Iterator#toArray()` to the end of iterator helper chains.

Iterator helpers are lazy. Calling `toArray()` before helper methods like `map()` or `filter()` creates a temporary array and makes the rest of the chain use `Array` methods instead of lazy `Iterator` methods.

## Examples

```js
// ❌
const result = iterator.toArray().map(fn);

// ✅
const result = iterator.map(fn).toArray();
```

```js
// ❌
const result = iterator.toArray().filter(fn);

// ✅
const result = iterator.filter(fn).toArray();
```

`flatMap()` is reported as a suggestion instead of an autofix because `Array#flatMap()` and `Iterator#flatMap()` differ when the callback returns a non-iterable value.

```js
// ❌
const result = iterator.toArray().flatMap(fn);

// ✅
const result = iterator.flatMap(fn).toArray();
```

This rule only handles direct lazy helper equivalents. It intentionally does not convert `Array#slice()` to `Iterator#take()` or `Iterator#drop()`.
