# prefer-set-methods

📝 Prefer `Set` methods for Set operations.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer modern `Set` methods for composing Sets and checking their relationships.

The built-in methods express set operations directly and avoid spelling out temporary arrays and membership-check loops.

## Examples

```js
// ❌
const union = new Set([...set, ...otherSet]);

// ✅
const union = set.union(otherSet);
```

```js
// ❌
const intersection = [...set].filter(value => otherSet.has(value));

// ✅
const intersection = set.intersection(otherSet);
```

```js
// ❌
const difference = [...set].filter(value => !otherSet.has(value));

// ✅
const difference = set.difference(otherSet);
```

The `new Set([...set, ...otherSet])` case is autofixed only when every spread operand is known to be a `Set` or `ReadonlySet`, and the operands are safe to reuse in the replacement.

```js
// ✅
new Set([...iterable, ...otherIterable]);
```

Intersection and difference filter patterns are reported as suggestions instead of autofixes because bare filters produce arrays. Direct `new Set([...set].filter(…))` wrappers are also suggestions: `intersection()` can change Set iteration order, and `difference()` follows the same opt-in model for consistency. For filter patterns, the rule only reports bare filter calls and direct `new Set([...set].filter(…))` wrappers.

## Set predicates

The rule autofixes membership checks and empty intersection or difference checks when both operands are known to be a `Set` or `ReadonlySet`:

```js
// ❌
const subset = [...set].every(value => otherSet.has(value));
const overlaps = [...set].some(value => otherSet.has(value));
const disjoint = set.intersection(otherSet).size === 0;
const contained = set.difference(otherSet).size === 0;

// ✅
const subset = set.isSubsetOf(otherSet);
const overlaps = !set.isDisjointFrom(otherSet);
const disjoint = set.isDisjointFrom(otherSet);
const contained = set.isSubsetOf(otherSet);
```

Strict inequality (`!== 0`) and reversed comparisons (`0 === set.intersection(otherSet).size`) are also supported. Inequality negates the corresponding predicate.

Callbacks must be synchronous arrow functions with one identifier parameter and a direct `otherSet.has(value)` expression body. Patterns with comments, optional chaining, or computed method access are ignored. These autofixes assume ordinary built-in Set behavior.

For both filter and predicate callbacks, evaluating the Set used for membership checks must not have side effects or depend on the callback parameter.
