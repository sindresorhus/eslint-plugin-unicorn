# Disallow anonymous functions and classes as the default export

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

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
