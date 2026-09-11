# no-unused-iterator-helper

📝 Disallow discarding lazy iterator helpers.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Iterator helpers `.map()`, `.filter()`, `.flatMap()`, `.take()`, and `.drop()` are lazy. They return another iterator without reading the source. If that iterator is discarded, callbacks never run and `.drop()` does not advance the source.

Applying `void` to a helper result or awaiting that result does not consume it, so this rule reports both.

## Examples

```js
// ❌
items.values().map(transform);
void items.values().filter(predicate);
await items.values().flatMap(transform);

// ✅
const transformed = items.values().map(transform).toArray();
const filtered = items.values().filter(predicate);

for (const item of filtered) {
	consume(item);
}
```

## Suggestions

For a discarded `.map(callback)`, the rule can suggest `.forEach(callback)`. This is not an autofix because it starts consuming the iterator. The suggestion requires exactly one non-spread argument and is omitted for explicit type arguments or TypeScript wrappers around the result.

The [`no-for-each`](./no-for-each.md) rule may prefer a `for…of` loop instead.

## Detection

The rule reports directly discarded helpers, including through `void`, `await`, TypeScript wrappers, and `for` initializers or updates.

The rule recognizes iterators from `.values()`, `.keys()`, `.entries()`, `.matchAll()`, supported `Iterator` static methods, helper chains, local synchronous generators, and known TypeScript iterator types. It also follows iterator values through plain, unannotated `const` bindings.

Without type information, it does not infer mutable or destructured bindings, imported functions, object methods, async generators, or ordinary function return values. Computed helper calls and discards nested in logical, conditional, or comma expressions are also ignored. The rule does not track whether a stored or returned iterator is eventually consumed, and syntax-only method matches may include custom APIs.

[`no-unused-builtin-method-return`](./no-unused-builtin-method-return.md) skips lazy helpers handled here. To discard one intentionally, use an ESLint disable comment; `void` still reports.
