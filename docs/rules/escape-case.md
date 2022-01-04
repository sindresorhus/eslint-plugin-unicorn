# Require escape sequences to use uppercase values

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- RULE_NOTICE_END -->

Enforces defining escape sequence values with uppercase characters rather than lowercase ones. This promotes readability by making the escaped value more distinguishable from the identifier.

## Fail

```js
const foo = '\xa9';
const foo = '\ud834';
const foo = '\u{1d306}';
const foo = '\ca';
```

## Pass

```js
const foo = '\xA9';
const foo = '\uD834';
const foo = '\u{1D306}';
const foo = '\cA';
```
