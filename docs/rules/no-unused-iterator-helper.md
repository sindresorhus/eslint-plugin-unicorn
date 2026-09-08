# no-unused-iterator-helper

📝 Disallow discarding lazy iterator helpers.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Iterator helpers `.map()`, `.filter()`, `.flatMap()`, `.take()`, and `.drop()` are lazy. They return a new iterator without consuming its values. Discarding that iterator means the transformation never runs. For example, `items.values().map(transform)` does not call `transform`, and `iterator.drop(1)` does not advance `iterator`.

Neither `void` nor `await` consumes an iterator. This rule reports both, as well as discarded expression statements and direct `for` initializer/update expressions. Argument evaluation and validation can still have effects when the helper is created.

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

```js
// ❌
const iterator = items.values();
iterator.drop(1);

// ✅
const remaining = items.values().drop(1);
for (const item of remaining) {
	consume(item);
}
```

## Suggestions

For a final `.map(callback)`, the rule can suggest `.forEach(callback)` to execute the callback for its side effects. This is a suggestion rather than an autofix because it starts consuming the iterator. The suggestion preserves comments and is omitted for calls with extra/spread arguments, explicit type arguments, or TypeScript wrappers around the result.

The separate [`no-for-each`](./no-for-each.md) rule may prefer a `for…of` loop instead. To retain mapped values, store or return the helper, or explicitly materialize it with `.toArray()`.

## Detection

The rule uses the same iterator recognition as [`prefer-iterator-helpers`](./prefer-iterator-helpers.md): `.values()`, `.keys()`, `.entries()`, `.matchAll()`, supported `Iterator` static methods, helper chains, and recognized TypeScript iterator types. These method names are syntax heuristics; custom APIs with the same names may also match. Type information is optional.

It also recognizes plain, unannotated `const` aliases and local synchronous generator calls, including generator functions stored in `const` variables and immutable alias chains. It does not infer iterators through mutable bindings, destructuring, imported functions, object methods, async generators, or ordinary function return values. Existing TypeScript type recognition can identify additional receivers.

Computed helper calls, as well as discard expressions nested in logical, conditional, or comma expressions, are intentionally unsupported. The rule does not track whether a stored or returned iterator is eventually consumed, and does not report eager consumers such as `.forEach()`, `.toArray()`, `.some()`, or `.next()`.

[`no-unused-builtin-method-return`](./no-unused-builtin-method-return.md) handles ignored built-in method results and skips the lazy iterator helper calls recognized by this rule. Use an ESLint disable comment for an intentional exception; `void` does not suppress this rule.
