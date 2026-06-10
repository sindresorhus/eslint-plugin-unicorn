# no-redundant-comparison

📝 Disallow comparisons made redundant by an equality check in the same logical AND.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When an `&&` chain contains an equality check (`===` or `!==`) between two references, a comparison on one of those references can already be implied by a comparison on the other. The redundant comparison adds nothing and just costs an extra evaluation.

This is not limited to identical comparisons. A stronger numeric bound implies a weaker one (`a > 2` implies `a > 0`), and a disequality propagates an equality (`a === 'x' && a !== b` implies `b !== 'x'`).

## Examples

```js
// ❌ — `b > 0` is implied by `a > 0` and `a === b`
if (a > 0 && b > 0 && a === b) {}

// ✅
if (a > 0 && a === b) {}
```

```js
// ❌ — `a > 0` is implied by the stronger `b > 2` and `a === b`
if (a > 0 && b > 2 && a === b) {}

// ✅
if (b > 2 && a === b) {}
```

```js
// ❌ — `b !== 'test'` is implied by `a !== 'test'` and `a === b`
if (a !== 'test' && b !== 'test' && a === b) {}

// ✅
if (a !== 'test' && a === b) {}
```

```js
// ❌ — `b !== 'test'` is implied by `a === 'test'` and `a !== b`
if (a === 'test' && b !== 'test' && a !== b) {}

// ✅
if (a === 'test' && a !== b) {}
```

This rule only applies to `&&` chains. In a `||` chain the operands are not all true at once, so the equality check cannot be used to imply another operand.

Removing a comparison drops its evaluation. When that evaluation could run user code — a getter, or a `valueOf`/`toString` coercion from an ordering check (`>`, `>=`, `<`, `<=`) — the rule offers a suggestion instead of an autofix to avoid changing behavior. A plain `===`/`!==` check is side-effect free and is autofixed.
