# This rule checks if conditions can be simpified

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->

✅ _This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config._

🔧 _This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems)._

<!-- /RULE_NOTICE -->

Dissallow unnecessary negations when using `Boolean` or `!`.

## Fail

```js
!(a != b);
!Boolean(a);
!!!a;
if (!!a) {
}
```

## Pass

```js
!!a;
Boolean(a);
!a;

a == b;
!a;
!a;
if (a) {
}
```
