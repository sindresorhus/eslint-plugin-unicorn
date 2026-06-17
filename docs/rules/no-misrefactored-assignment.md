# no-misrefactored-assignment

📝 Disallow misrefactored compound assignments where the target is duplicated in the right-hand side.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A compound assignment like `a += a + b` repeats the assignment target as an operand of the matching operator. This is almost always a refactoring mistake: it computes `a = a + (a + b)` (that is, `2 * a + b`), when the author most likely meant `a += b`.

The rule reports when the target of an arithmetic or bitwise compound assignment reappears as an operand of a right-hand side binary expression that uses the same operator.

For commutative operators (`+`, `*`, `&`, `|`, `^`), the target is matched in either operand (`a += a + b` and `a += b + a`). For non-commutative operators (`-`, `/`, `%`, `**`, `<<`, `>>`, `>>>`), only the left operand is matched, since the right-operand form (`a -= b - a`) has a distinct, meaningful value.

The suggested fix changes runtime behavior, so it is offered as a suggestion rather than an automatic fix.

## Examples

```js
// ❌
a += a + b;

// ✅
a += b;
```

```js
// ❌
a *= b * a;

// ✅
a *= b;
```

```js
// ✅
a += b + c;
```

```js
// ✅ The operator does not match, so this is not flagged.
a += a - b;
```

```js
// ✅ Non-commutative operator with the target as the right operand.
a -= b - a;
```
