# Require escape sequences to use uppercase values

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
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
