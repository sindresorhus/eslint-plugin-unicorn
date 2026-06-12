# no-negated-comparison

📝 Disallow negated comparisons.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using the opposite comparison operator instead of negating the whole comparison.

The rule intentionally does not rewrite compound logical expressions like `!(a === b && c === d)`. Keeping the grouped negation can be easier to read than applying De Morgan's laws.

## Examples

```js
// ❌
const isDifferent = !(a === b);

// ✅
const isDifferent = a !== b;
```

```js
// ❌
if (!(typeof value === 'undefined')) {}

// ✅
if (typeof value !== 'undefined') {}
```

```js
// ✅
if (!(a === b && c === d)) {}
```
