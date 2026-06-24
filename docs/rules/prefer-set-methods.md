# prefer-set-methods

📝 Prefer `Set` methods for Set operations.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer modern `Set` methods over manually composing Sets with spread arrays and filters.

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

The `new Set([...set, ...otherSet])` case is autofixed only when every spread operand is known to be a `Set`.

```js
// ✅
new Set([...iterable, ...otherIterable]);
```

Intersection patterns are reported as suggestions instead of autofixes because replacing an array filter with `Set#intersection()` can change the result type, and replacing `new Set([...set].filter(value => otherSet.has(value)))` can change Set iteration order.
