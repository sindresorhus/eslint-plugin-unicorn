# no-unnecessary-nested-ternary

📝 Disallow unnecessary nested ternary expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Nested ternary expressions are unnecessary when two branches use the same expression and the conditions can be combined with a logical operator.

Longer chains are simplified when strict literal comparisons, simple local guards, or type predicates prove conditions mutually exclusive. Type-based proofs require `strictNullChecks`.

Chain simplifications and inverse folds in typed code use suggestions; review type narrowing and unknown guard side effects.

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
// ❌
a ? (b ? d : c) : d;

// ✅
a && !b ? c : d;
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
