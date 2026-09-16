# prefer-logical-operator-over-ternary

📝 Prefer using a logical operator over a ternary.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow ternary operators when simpler logical operator alternatives exist.

Ideally, most reported cases have an equivalent [`Logical OR` (`||`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR) expression. For these cases, the rule intentionally provides suggestions instead of auto-fixes, because in many cases, the [nullish coalescing operator (`??`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) should be preferred.

For explicit nullish-check ternaries, this rule only suggests `??` when the source code itself proves nullish intent. It does not report arbitrary `foo || bar` expressions. TypeScript users who want type-aware `||` checks should use [`@typescript-eslint/prefer-nullish-coalescing`](https://typescript-eslint.io/rules/prefer-nullish-coalescing/).

Ternaries with exactly one boolean literal branch are automatically fixed when both the condition and the other branch are known to be boolean. Boolean values can be recognized from expressions, variable declarations, TypeScript annotations, or TypeScript type information when available. Unknown or non-boolean values are not handled by this check. If the ternary contains comments, it is reported without a fix.

For boolean `condition` and `expression` values:

| Ternary | Replacement |
| --- | --- |
| `condition ? true : expression` | `condition \|\| expression` |
| `condition ? false : expression` | `!condition && expression` |
| `condition ? expression : false` | `condition && expression` |
| `condition ? expression : true` | `!condition \|\| expression` |

Use ESLint's [`no-unneeded-ternary`](https://eslint.org/docs/latest/rules/no-unneeded-ternary) for ternaries with two boolean literal branches, such as `condition ? true : false`.

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
