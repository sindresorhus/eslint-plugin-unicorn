# Prefer using logical operator over ternary

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

Disallow ternary operators when simpler logical operator alternatives exist.

Ideally, most cases we report are equivalent to a [`Logical OR(||)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR) expression. We provide suggestions instead of auto-fix intentionally, because in many cases, [`Nullish coalescing operator(??)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) should be preferred.

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
