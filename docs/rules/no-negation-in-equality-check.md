# Disallow negated expression in equality check

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using a negated expression in equality check is most likely a mistake.

## Fail

```js
if (!foo === bar) {}
```

```js
if (!foo !== bar) {}
```

## Pass

```js
if (foo !== bar) {}
```

```js
if (!(foo === bar)) {}
```
