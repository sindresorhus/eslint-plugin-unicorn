# no-useless-logical-operand

📝 Disallow unnecessary operands in logical expressions involving boolean literals.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Logical `&&` and `||` expressions return one of their operands. A boolean literal can make part of the expression unnecessary, but it is not always safe to simplify. For example, `value && true` returns `true` for any truthy non-boolean `value`, while `value` would return the original value.

This rule only reports boolean literal operands when the simplification preserves JavaScript value semantics, or when the expression is used only for truthiness. Autofixes are skipped when comments or directive prologue semantics could be affected.

It intentionally does not report non-leading absorbing operands like `value && false` or `value || true`. Those expressions still evaluate `value`, so replacing the whole expression with a literal could drop side effects or thrown errors. Use ESLint's [`no-constant-binary-expression`](https://eslint.org/docs/latest/rules/no-constant-binary-expression) rule if you want those suspicious expressions reported without an autofix.

## Examples

```js
// ❌
const value = true && input;
const other = input && true && fallback;

// ✅
const value = input;
const other = input && fallback;
```

```js
// ❌
if (input && true) {}
const value = Boolean(input || false);

// ✅
if (input) {}
const value = Boolean(input);
```

```js
// ❌
const value = false && input;
const other = true || input;

// ✅
const value = false;
const other = true;
```

```js
// Not reported by this rule
const value = input && true;
const other = input || false;
const alwaysFalse = input && false;
const alwaysTrue = input || true;
```
