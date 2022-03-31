# Disallow useless case in switch statement

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

<!-- Remove this comment, add more detailed description. -->

## Fail

```js
const foo = 'unicorn';
```

## Pass

```js
const foo = '🦄';
```
