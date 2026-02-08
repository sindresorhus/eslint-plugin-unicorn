# Enforce consistent style for escaping `${` in template literals

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

There are multiple ways to escape `${` in a template literal to prevent it from being interpreted as an expression:

- `\${` — escape the dollar sign ✅
- `$\{` — escape the opening brace ❌
- `\$\{` — escape both ❌

This rule enforces escaping the dollar sign (`\${`) for consistency.

## Examples

```js
// ❌
const foo = `$\{a}`;

// ❌
const foo = `\$\{a}`;

// ✅
const foo = `\${a}`;
```
