# no-unnecessary-nested-ternary

📝 Disallow unnecessary nested ternary expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Nested ternary expressions are unnecessary when two branches use the same expression and the conditions can be combined with a logical operator.

The rule also simplifies longer chains when strict literal comparisons prove the relevant conditions are mutually exclusive. Local guard analysis requires a direct binding to a synchronous function that returns a supported comparison. When implementations are unavailable, type information and `strictNullChecks` allow suggestions for disjoint concrete primitive types, literal unions, or concrete object types with conflicting required literal discriminants.

New chain simplifications in TypeScript or JavaScript with type annotations are suggestions requiring type review. Loose equality is not used to prove exclusivity. Generic or overloaded predicate signatures and unresolved target types are not used for type-based proofs.

## Examples

```js
// ❌
a ? (b ? c : d) : d;

// ✅
a && b ? c : d;
```

```js
// ❌
a ? d : (b ? d : c);

// ✅
a || b ? d : c;
```

```js
// ✅
a ? (b ? c : d) : e;
```

```js
// ❌
x === 1 ? a : (x === 2 ? b : (x === 3 ? a : c));

// ✅
x === 1 || x === 3 ? a : (x === 2 ? b : c);
```

```js
// ❌
x === 1 ? a : (x === 2 ? c : (x === 3 ? b : c));

// ✅
x === 1 ? a : (x === 3 ? b : c);
```

```js
// ❌
x === 1 ? (enabled ? a : c) : (x === 2 ? b : c);

// ✅
x === 1 && enabled ? a : (x === 2 ? b : c);
```
