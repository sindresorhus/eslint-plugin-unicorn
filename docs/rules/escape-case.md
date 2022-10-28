# Require escape sequences to use uppercase values

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

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
