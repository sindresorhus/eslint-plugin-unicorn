# prefer-iterator-helpers

📝 Prefer iterator helpers over temporary arrays from iterators.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Prefer calling iterator helpers before converting an iterator to an array. Bounded `.take()` calls can avoid unnecessary consumption. Using only `.drop()` still exhausts the iterator, but avoids storing the discarded prefix.

## Examples

```js
// ❌
[...map.values()].find(value => value.id === id);

// ✅
map.values().find(value => value.id === id);
```

```js
// ❌
iterator.toArray().slice(20, 30);

// ✅
iterator.drop(20).take(10).toArray();
```

```js
// ❌
[...text.matchAll(pattern)].slice(0, 10);

// ✅
text.matchAll(pattern).take(10).toArray();
```

The rule recognizes `.values()`, `.keys()`, `.entries()`, `.matchAll()`, static `Iterator` methods, lazy helper chains, and supported TypeScript iterator types. Slice conversions also treat a zero-argument `.toArray()` as iterator evidence. Custom methods matched by name must support iterator helpers. Arbitrary iterables are ignored because not every iterable has those methods.

Terminal conversions support `.every()`, `.find()`, `.forEach()`, `.reduce()`, and `.some()` after a single-spread array or one-argument `Array.from()`. Inline callbacks that can observe the extra `array` argument are ignored.

Slice conversions support `.slice()` directly after `.toArray()`, a single-spread array, or one-argument `Array.from()`. Bounds must be statically known nonnegative safe integers. Copy-only `.slice()` and `.slice(0)` are ignored.

Calls are ignored when a suggestion would remove their type arguments.

Changes are offered as suggestions because callbacks and iterator consumption can behave differently. In particular, `.take()` can skip later side effects or errors and close the iterator early. Comments that cannot be preserved prevent a suggestion.

The rule does not report `.filter()`, `.map()`, or `.flatMap()` because their iterator versions return iterators. See [`prefer-iterator-to-array-at-end`](prefer-iterator-to-array-at-end.md) for those methods.
