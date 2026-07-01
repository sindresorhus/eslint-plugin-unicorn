# prefer-simplified-conditions

📝 Prefer simplified conditions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer simpler logical conditions when they are equivalent and easier to read.

This rule applies De Morgan's laws, factors direct leading common terms in boolean conditions, and removes simple absorbed conditions. It intentionally does not try to be a full boolean algebra optimizer.

Factoring is intentionally limited to leading common terms to avoid changing evaluation order.

Absorbed conditions that would otherwise skip reading another operand are only fixed when that operand can be inferred to be safe to drop.

## Examples

```js
// ❌
if (!(a && b)) {}

// ✅
if (!a || !b) {}
```

```js
// ❌
if (!(key === 'y' && !isEditable(target))) {}

// ✅
if (key !== 'y' || isEditable(target)) {}
```

```js
// ❌
if ((a && b) || (a && c)) {}

// ✅
if (a && (b || c)) {}
```

```js
// ❌
if ((c || a) && (c || b)) {}

// ✅
if (c || (a && b)) {}
```

```js
// ❌
if (a || (a && b)) {}

// ✅
if (a) {}
```

The rule avoids factoring expressions when the result would be used as a value instead of a boolean, unless the operands are known booleans.

```js
// ✅
const value = (a && b) || (a && c);
```
