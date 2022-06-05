# Prefer using logical operator over ternary

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

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
