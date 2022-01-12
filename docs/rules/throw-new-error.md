# Require `new` when throwing an error

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

While it's possible to create a new error without using the `new` keyword, it's better to be explicit.

## Fail

```js
throw Error();
```

```js
throw TypeError('unicorn');
```

```js
throw lib.TypeError();
```

## Pass

```js
throw new Error();
```

```js
throw new TypeError('unicorn');
```

```js
throw new lib.TypeError();
```
