# Disallow useless fallback when creating a `Set`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

It's unnecessary to provide empty array or string as fallback when creating a `Set` from an iterable object, since if [the `Set` constructor accepts nullish values](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/Set#iterable).

## Examples

```js
// ❌
const set = new Set(foo ?? []);
// ❌
const set = new Set(foo ?? "");

// ✅
const set = new Set(foo);
```
