# Require `Array.isArray()` instead of `instanceof Array`

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

The `instanceof Array` check doesn't work across realms/contexts, for example, frames/windows in browsers or the `vm` module in Node.js.

## Fail

```js
array instanceof Array;
[1,2,3] instanceof Array;
```

## Pass

```js
Array.isArray(array);
Array.isArray([1,2,3]);
```
