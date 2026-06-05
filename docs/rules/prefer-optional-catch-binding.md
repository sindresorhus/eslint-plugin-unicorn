# prefer-optional-catch-binding

📝 Prefer omitting the `catch` binding parameter.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

If the `catch` binding parameter is not used, it should be omitted.

## Examples

```js
// ❌
try {} catch (notUsedError) {}

// ❌
try {} catch ({message}) {}

// ✅
try {} catch {}
```
