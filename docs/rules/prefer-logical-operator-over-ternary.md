# Prefer using logical operator over ternary

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

<!-- Remove this comment, add more detailed description. -->

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
foo.bar ?? foo.baz
```

```js
foo?.bar ?? baz
```
