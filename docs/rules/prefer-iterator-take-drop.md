# prefer-iterator-take-drop

📝 Prefer iterator `take()` and `drop()` over slicing a materialized array.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer limiting an iterator with `.take()` and `.drop()` before converting it to an array, instead of materializing the entire iterator and then calling `.slice()`.

A bounded slice can avoid consuming the rest of the iterator and allows bounded consumption of infinite sources. A slice with only a positive start uses `.drop()`: it still consumes the entire iterator, but avoids storing the discarded prefix and creating an intermediate array.

## Examples

```js
// ❌
const matches = [...text.matchAll(pattern)].slice(0, 10);

// ✅
const matches = text.matchAll(pattern).take(10).toArray();
```

```js
// ❌
const page = iterator.toArray().slice(20, 30);

// ✅
const page = iterator.drop(20).take(10).toArray();
```

```js
// ❌
const remaining = Array.from(map.values()).slice(20);

// ✅
const remaining = map.values().drop(20).toArray();
```

## Supported patterns

The rule reports `.slice()` immediately following `.toArray()`, a single-spread array, or `Array.from()` with exactly one argument. A zero-argument `.toArray()` call is treated as evidence of an iterator, consistent with the other iterator rules.

For spreads and `Array.from()`, the source must be recognized as an iterator: an `Iterator` static method, `.values()`, `.keys()`, `.entries()`, `.matchAll()`, a lazy helper chain on a recognized iterator, or a supported TypeScript iterator type. Unknown iterable variables, arrays, strings, and sets are not reported merely because they are iterable. Custom methods with these names and custom iterator implementations must support the suggested helpers.

Bounds must be statically known nonnegative safe integers. Numeric literals, constant bindings, and arithmetic expressions are supported. Suggestions use their numeric values. Negative or fractional bounds, `Infinity`, explicit `undefined`, mutable bindings, and bounds with side effects are ignored.

Empty ranges use `.take(0).toArray()`, preserving evaluation of the iterator expression. Copy-only `.slice()` and `.slice(0)` are ignored. The rule also ignores `super.toArray()`, optional materialization or slice calls, computed method names, extra or spread arguments, type arguments on transformed calls, and type assertions around the materialized array.

## Suggestions

This rule does not provide automatic fixes. Consuming fewer elements can change side effects, skip errors in the unconsumed portion, and close the iterator earlier through its `return()` method. Review the iterator's behavior before applying a suggestion. Even an empty range can invoke iterator cleanup.

Comments inside the preserved iterator expression are retained. If a transformation would remove or relocate other comments, the rule reports the problem without a suggestion.

The suggested code requires support for [iterator helpers](https://v8.dev/features/iterator-helpers). See also the [ECMAScript `Iterator.prototype.take` specification](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-iterator.prototype.take).

## Related rules

- [prefer-iterator-to-array](prefer-iterator-to-array.md) prefers `.toArray()` over iterator spreads.
- [prefer-iterator-to-array-at-end](prefer-iterator-to-array-at-end.md) moves `.toArray()` after `.map()`, `.filter()`, and `.flatMap()`.
- [prefer-iterator-helpers](prefer-iterator-helpers.md) replaces materialization followed by a terminal array operation with an iterator helper.
- [no-useless-iterator-to-array](no-useless-iterator-to-array.md) removes unnecessary materialization in iterable consumers.
- [prefer-spread](prefer-spread.md) can convert `Array.from()` into a spread. This rule supports either form.
