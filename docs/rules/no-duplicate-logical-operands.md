# no-duplicate-logical-operands

📝 Disallow adjacent duplicate operands in logical expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using the same reference on adjacent sides of `&&` or `||` is usually a copy-paste mistake or redundant code. `foo && foo` and `foo || foo` evaluate the same reference twice and can be simplified to `foo`.

This rule is intentionally narrow. It only checks adjacent duplicate logical operands. It does not check non-adjacent repeats like `foo && bar && foo`. It does not check self-comparisons like `foo > foo`; use ESLint's [`no-self-compare`](https://eslint.org/docs/latest/rules/no-self-compare) for that. It also does not check constant short-circuit expressions like `true && foo`; use ESLint's [`no-constant-binary-expression`](https://eslint.org/docs/latest/rules/no-constant-binary-expression) for that.

Related Unicorn rules cover different comparison patterns:

- [`no-double-comparison`](./no-double-comparison.md) combines two comparisons of the same operands, like `x === y || x < y`.
- [`no-redundant-comparison`](./no-redundant-comparison.md) removes comparisons implied by an equality check in the same `&&` chain.

## Examples

```js
// ❌
if (isReady && isReady) {}

// ✅
if (isReady) {}
```

```js
// ❌
const result = value || value;

// ✅
const result = value;
```

```js
// ❌
if (object.isReady && object.isReady) {}

// ✅
if (object.isReady) {}
```

## Fixes

Duplicate identifiers and `this` expressions are autofixed.

Member expressions are reported with an editor suggestion instead of an autofix because property reads can trigger getters or proxy traps.

```js
// ❌
object.isReady && object.isReady;

// ✅
object.isReady;
```

The rule skips calls, optional chains, assignments, updates, complex computed keys, and `with` statement scopes because removing one side could change runtime behavior.
