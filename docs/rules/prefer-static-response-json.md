# Prefer `Response.json()` over `new Response(JSON.stringify())`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using [`Response.json()`](https://developer.mozilla.org/en-US/docs/Web/API/Response/json_static) when possible.

## Examples

```js
// ❌
const response = new Response(JSON.stringify(data));

// ✅
const response = Response.json(data);
```
