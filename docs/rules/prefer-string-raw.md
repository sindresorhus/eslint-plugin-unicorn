# Prefer `String.raw` tag to avoid escape ``

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Remove this comment, add more detailed description. -->

## Fail

```js
const foo = 'unicorn';
```

## Pass

```js
const foo = '🦄';
```
