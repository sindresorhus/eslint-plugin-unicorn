# prefer-logical-operator-over-ternary

📝 Prefer using a logical operator over a ternary.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow ternary operators when simpler logical operator alternatives exist.

For patterns such as `foo ? foo : bar`, the rule provides suggestions instead of automatic fixes because either [`Logical OR` (`||`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR) or the [nullish coalescing operator (`??`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) may be appropriate.

For explicit nullish-check ternaries, this rule only suggests `??` when the source code itself proves nullish intent. It does not report arbitrary `foo || bar` expressions. TypeScript users who want type-aware `||` checks should use [`@typescript-eslint/prefer-nullish-coalescing`](https://typescript-eslint.io/rules/prefer-nullish-coalescing/).

Ternaries with exactly one constant boolean branch are automatically fixed in JavaScript when the parser does not expose TypeScript services, as shown below. This includes boolean literals and chains of simple `const` aliases within the same execution scope. Aliases in shared `switch` scopes are not resolved. TypeScript `satisfies` and non-null wrappers are recognized, as are `as const`, `<const>`, and matching literal assertions such as `as true`. Other type assertions and explicitly widened alias types are skipped. Mutable bindings, references before initialization, and computed initializer expressions are not resolved.

The other branch can have any type. Replacements that negate the condition work with any condition; the remaining forms require a known boolean condition. Boolean conditions can be recognized from expressions, variable declarations, TypeScript annotations, or TypeScript type information when available. Function declarations are inferred from their bodies only when their binding is in a strict, non-global scope; script globals and sloppy nested declarations are skipped because they can be replaced dynamically. If the ternary contains comments, it is reported without a fix.

Boolean inference assumes bindings are not modified by direct `eval`. Such dynamic changes are not analyzed. Inside `with` statements, the rule skips checks for constant boolean branches because runtime lookup can shadow statically resolved bindings. Suggestions for patterns such as `foo ? foo : bar` still apply.

These ternaries are reported without a fix in TypeScript and in JavaScript parsed with TypeScript services because logical operators can change inferred types and overload resolution even when the condition's type is exactly `boolean`.

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
