# prefer-iterator-to-array-at-end

📝 Prefer moving `.toArray()` to the end of iterator helper chains.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

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

Cases are reported as suggestions instead of autofixes because moving `toArray()` changes when callbacks run: `Array` methods run after the iterator has been exhausted, while `Iterator` helpers run lazily as the result is consumed. `Array` callbacks also receive an extra `array` argument that `Iterator` callbacks do not.

`flatMap()` has an additional difference: `Array#flatMap()` accepts non-iterable callback results, while `Iterator#flatMap()` requires iterable results.

```js
// ❌
const result = iterator.toArray().flatMap(fn);

// ✅
const result = iterator.flatMap(fn).toArray();
```

This rule only handles direct lazy helper equivalents. It intentionally does not convert `Array#slice()` to `Iterator#take()` or `Iterator#drop()`.
