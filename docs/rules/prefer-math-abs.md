# Prefer `Math.abs` in some calculation cases

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Remove this comment, add more detailed description. -->

## Fail

```js
a < 0 ? -a : a
a <= 0 ? -a : a
a > 0 ? a : -a
a >= 0 ? a : -a

window.a < 0 ? -window.a : window.a
window.a <= 0 ? -window.a : window.a
window.a > 0 ? window.a : -window.a
window.a >= 0 ? window.a : -window.a

a < 0 ? -a : +a
a < 0 ? -a : +(a)
```

## Pass

```js
const a = Math.abs(b);

if (Math.abs(number) > POSITIVE_CONSTANT) {}
```
