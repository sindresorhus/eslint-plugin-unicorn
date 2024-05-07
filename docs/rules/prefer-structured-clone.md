# Prefer using `structuredClone` to create a deep clone

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Remove this comment, add more detailed description. -->

## Fail

```js
const clone = JSON.parse(JSON.stringify(foo));
```

```js
const clone = _.cloneDeep(foo);
```

## Pass

```js
const clone = structuredClone(foo);
```
