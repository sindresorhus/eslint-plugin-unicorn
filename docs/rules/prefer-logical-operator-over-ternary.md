# prefer-logical-operator-over-ternary

📝 Prefer using a logical operator over a ternary.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow ternary operators when simpler logical operator alternatives exist.

Ideally, most reported cases have an equivalent [`Logical OR` (`||`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR) expression. For these cases, the rule intentionally provides suggestions instead of auto-fixes, because in many cases, the [nullish coalescing operator (`??`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) should be preferred.

For explicit nullish-check ternaries, this rule only suggests `??` when the source code itself proves nullish intent. It does not report arbitrary `foo || bar` expressions. TypeScript users who want type-aware `||` checks should use [`@typescript-eslint/prefer-nullish-coalescing`](https://typescript-eslint.io/rules/prefer-nullish-coalescing/).

Ternaries with exactly one constant boolean branch are automatically fixed as shown below. This includes boolean literals and chains of simple `const` aliases. TypeScript `satisfies` and non-null wrappers are supported, as are `as const`, `<const>`, and matching literal assertions such as `as true`. Other type assertions and explicitly widened alias types are skipped because replacing the ternary can change the expression's static type. Mutable bindings, references before initialization, and computed initializer expressions are not resolved.

The other branch can have any type. Replacements that negate the condition work with any condition; the remaining forms require a known boolean condition. Boolean conditions can be recognized from expressions, variable declarations, TypeScript annotations, or TypeScript type information when available. If the ternary contains comments, it is reported without a fix.

| Ternary | Replacement | Condition type |
| --- | --- | --- |
| `condition ? true : expression` | `condition \|\| expression` | Boolean |
| `condition ? false : expression` | `!condition && expression` | Any |
| `condition ? expression : false` | `condition && expression` | Boolean |
| `condition ? expression : true` | `!condition \|\| expression` | Any |

Use ESLint's [`no-unneeded-ternary`](https://eslint.org/docs/latest/rules/no-unneeded-ternary) for ternaries with two boolean literal branches, such as `condition ? true : false`.

```js
const yes = true;

// ❌
value === expected ? yes : fallback();

// ✅
(value === expected) || fallback();
```

## Examples

```js
// ❌
foo ? foo : bar;

// ✅
foo ?? bar;

// ✅
foo || bar;
```

```js
// ❌
foo.bar ? foo.bar : foo.baz

// ✅
foo.bar ?? foo.baz
```

```js
// ❌
foo?.bar ? foo.bar : baz

// ✅
foo?.bar ?? baz
```

```js
// ❌
!bar ? foo : bar;

// ✅
bar ?? foo;
```

```js
// ❌
foo == null ? bar : foo;

// ✅
foo ?? bar;
```

```js
// ❌
foo === null || foo === undefined ? bar : foo;

// ✅
foo ?? bar;
```

```js
// ❌
foo !== null && foo !== undefined ? foo : bar;

// ✅
foo ?? bar;
```

```js
// ❌
foo == null ? undefined : foo.bar;

// ✅
foo?.bar;
```

```js
// ✅
foo ? bar : baz;
```
