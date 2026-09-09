# no-useless-set-construction

📝 Disallow unnecessary `Set` construction around `Set` methods.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Modern Set methods accept Set-like arguments and do not mutate their receiver, so intermediate Sets are often unnecessary.

This rule checks `union()`, `intersection()`, `difference()`, `symmetricDifference()`, `isSubsetOf()`, `isSupersetOf()`, and `isDisjointFrom()` on known Sets.

## Examples

### Arguments

Set methods accept objects with `size`, `has()`, and `keys()`, so a Map acts as a Set of its keys.

```js
const selected = new Set([1, 2]);
const records = new Map([[2, 'value']]);
const other = new Set([2, 3]);

// ❌
selected.intersection(new Set(records.keys()));
selected.union(new Set(other));
selected.difference(new Set(other.values()));

// ✅
selected.intersection(records);
selected.union(other);
selected.difference(other);
```

Map values and entries differ from keys, so the rule ignores `new Set(map.values())`, `new Set(map.entries())`, and `new Set(map)`. It also ignores Set `.entries()`, which yields pairs.

### Receiver copies

All seven methods leave their receiver unchanged, so an immediate copy is unnecessary when argument evaluation has no detectable side effects.

```js
const selected = new Set([1, 2]);
const other = new Set([2, 3]);

// ❌
new Set(selected).union(other);
new Set(selected.keys()).isSubsetOf(other);

// ✅
selected.union(other);
selected.isSubsetOf(other);
```

Receiver copies remain when the argument is not a known Set or Map, or its evaluation has detectable side effects. For example, `new Set(selected).union((selected.clear(), other))` preserves the original contents of `selected`, so removing the copy would change the result.

### Result copies

`union()`, `intersection()`, `difference()`, and `symmetricDifference()` return fresh Sets.

```js
const selected = new Set([1, 2]);
const other = new Set([2, 3]);

// ❌
const combined = new Set(selected.union(other));

// ✅
const combined = selected.union(other);
```

Ordinary Set copies outside these method calls are allowed.

## Limitations

Detection is limited to built-in Sets and Maps recognized from constructors, `const` aliases, or supported TypeScript types. The rule does not perform flow analysis or account for overridden built-ins, accessor or Proxy side effects, or cross-realm collections.

The rule skips optional calls, computed method names, calls with spread or unexpected argument counts, explicit type arguments on `Set` constructions, and TypeScript expression wrappers around constructions in argument or receiver position or around result-producing method calls. Autofixes are withheld if they would discard comments.

## Related rules

- [prefer-set-methods](./prefer-set-methods.md) replaces manual Set operations with modern methods.
- [no-useless-spread](./no-useless-spread.md) and [no-useless-iterator-to-array](./no-useless-iterator-to-array.md) remove intermediate arrays and can expose further opportunities for this rule.
- [no-useless-collection-argument](./no-useless-collection-argument.md) removes unnecessary empty constructor arguments.
