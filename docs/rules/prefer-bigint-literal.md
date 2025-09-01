# Prefer bigint literal over `BigInt` wrapper

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using bigint literal over `BigInt(…)` where possible.

## Examples

```js
// ❌
const bigint = BigInt(1);

// ✅
const bigint = 1n;
```

```js
// ❌
const bigint = BigInt("1");

// ✅
const bigint = 1n;
```
