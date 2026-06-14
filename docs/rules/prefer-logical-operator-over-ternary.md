# prefer-logical-operator-over-ternary

📝 Prefer using a logical operator over a ternary.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow ternary operators when simpler logical operator alternatives exist.

Ideally, most reported cases have an equivalent [`Logical OR` (`||`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR) expression. The rule intentionally provides suggestions instead of auto-fixes, because in many cases, the [nullish coalescing operator (`??`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) should be preferred.

For explicit nullish-check ternaries, this rule only suggests `??` when the source code itself proves nullish intent. It does not report arbitrary `foo || bar` expressions. TypeScript users who want type-aware `||` checks should use [`@typescript-eslint/prefer-nullish-coalescing`](https://typescript-eslint.io/rules/prefer-nullish-coalescing/).

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
