# Prefer simple conditions first in logical expressions

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When writing multiple conditions in a logical expression (`&&`, `||`), simple conditions should come first. This can improve readability and performance, since simple checks like identifiers and strict equality comparisons are cheaper to evaluate and can short-circuit before expensive operations.

A condition is considered "simple" if it is:
- A bare identifier (`foo`)
- A strict equality/inequality comparison between identifiers and/or literals (`foo === 1`, `a !== b`)

## Examples

### `&&`

```js
// ❌
if (check(foo) && bar);

// ✅
if (bar && check(foo));
```

```js
// ❌
if (foo.bar.baz === 1 && bar === 2);

// ✅
if (bar === 2 && foo.bar.baz === 1);
```

### `||`

```js
// ❌
const x = foo() || bar;

// ✅
const x = bar || foo();
```

## Fix safety

When the complex side contains function calls or `new` expressions, the fix is provided as a **suggestion** rather than an auto-fix, because reordering changes when the call executes due to short-circuit evaluation.

When both sides are side-effect-free (identifiers, member expressions without calls, literals), the fix is applied automatically.
