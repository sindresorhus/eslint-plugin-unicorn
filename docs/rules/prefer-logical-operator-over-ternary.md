# Prefer using a logical operator over a ternary

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow ternary operators when simpler logical operator alternatives exist.

Ideally, most reported cases have an equivalent [`Logical OR(||)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR) expression. The rule intentionally provides suggestions instead of auto-fixes, because in many cases, the [nullish coalescing operator (`??`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) should be preferred.

## Fail

```js
foo ? foo : bar;
```

```js
foo.bar ? foo.bar : foo.baz
```

```js
foo?.bar ? foo.bar : baz
```

```js
!bar ? foo : bar;
```

## Pass

```js
foo ?? bar;
```

```js
foo || bar;
```

```js
foo ? bar : baz;
```

```js
foo.bar ?? foo.baz
```

```js
foo?.bar ?? baz
```
