# no-useless-set-construction

📝 Disallow unnecessary `Set` construction around `Set` methods.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Modern Set methods accept Set-like arguments and do not mutate their receiver. Constructing an intermediate Set is often unnecessary.

This rule checks `union()`, `intersection()`, `difference()`, `symmetricDifference()`, `isSubsetOf()`, `isSupersetOf()`, and `isDisjointFrom()` on known Sets.

## Examples

### Arguments

Set methods accept objects with `size`, `has()`, and `keys()`. A Map implements this interface and behaves as a Set of its keys.

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

Map values and entries are different from keys, so `new Set(map.values())`, `new Set(map.entries())`, and `new Set(map)` are left unchanged. Set `.entries()` also produces pairs and is left unchanged.

### Receiver copies

All seven methods leave their receiver unchanged, so copying a Set immediately before calling them is unnecessary when evaluating the argument has no side effects.

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

The rule leaves receiver copies unchanged when the argument is not a known Set or Map, or evaluating it could have side effects. For example, `new Set(selected).union((selected.clear(), other))` preserves the original contents of `selected`, so removing that copy would change the result.

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

The rule recognizes built-in Set and Map constructors, `const` aliases, and supported TypeScript annotations and type information. It does not infer arbitrary custom Set-like objects or add flow analysis. Custom collection implementations and overridden built-in behavior are unsupported.

Optional calls, computed method names, spread or extra arguments, and Set constructions with explicit TypeScript type arguments are skipped. Reports have no autofix when removing the construction would discard comments.

TypeScript assertions and `satisfies` expressions around a construction are skipped for argument and receiver copies. They are also skipped around the Set method call inside a result copy because removing the construction can cause type errors or change the expression's static type.

## Related rules

- [prefer-set-methods](./prefer-set-methods.md) replaces manual Set operations with modern methods.
- [no-useless-spread](./no-useless-spread.md) and [no-useless-iterator-to-array](./no-useless-iterator-to-array.md) remove intermediate arrays and can expose further opportunities for this rule.
- [no-useless-collection-argument](./no-useless-collection-argument.md) removes unnecessary empty constructor arguments.

## References

- [ECMAScript specification: Set Objects](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set-objects)
- [Set methods proposal](https://tc39.es/proposal-set-methods/)
