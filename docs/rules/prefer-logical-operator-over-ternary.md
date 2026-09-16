# prefer-logical-operator-over-ternary

📝 Prefer using a logical operator over a ternary.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow ternary operators when simpler logical operator alternatives exist.

For patterns such as `foo ? foo : bar`, the rule provides suggestions instead of automatic fixes because either [`Logical OR` (`||`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR) or the [nullish coalescing operator (`??`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) may be appropriate.

For explicit nullish-check ternaries, this rule only suggests `??` when the source code itself proves nullish intent. It does not report arbitrary `foo || bar` expressions. TypeScript users who want type-aware `||` checks should use [`@typescript-eslint/prefer-nullish-coalescing`](https://typescript-eslint.io/rules/prefer-nullish-coalescing/).

The rule also handles ternaries with exactly one constant boolean branch, including simple `const` aliases: `condition ? true : expression` becomes `condition || expression`; `condition ? false : expression` becomes `!condition && expression`; `condition ? expression : false` becomes `condition && expression`; and `condition ? expression : true` becomes `!condition || expression`.

The other branch can have any type. The condition must be boolean for the first and third forms. These cases are reported without a fix in TypeScript, in JavaScript parsed with TypeScript services, or when they contain comments. This check is skipped inside `with` statements. Ternaries with two constant boolean branches are also skipped; use ESLint's [`no-unneeded-ternary`](https://eslint.org/docs/latest/rules/no-unneeded-ternary) for two boolean literals.

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
