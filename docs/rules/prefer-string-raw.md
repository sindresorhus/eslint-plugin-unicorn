# Prefer using the `String.raw` tag to avoid escaping `\`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`String.raw`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw) can be used to avoid escaping `\`.

## Examples

```js
// ❌
const file = "C:\\windows\\style\\path\\to\\file.js";

// ✅
const file = String.raw`C:\windows\style\path\to\file.js`;
```

```js
// ❌
const regexp = new RegExp('foo\\.bar');

// ✅
const regexp = new RegExp(String.raw`foo\.bar`);
```

```js
// ❌
const file = `C:\\windows\\temp\\myapp-${process.pid}.log`;

// ✅
const file = String.raw`C:\windows\temp\myapp-${process.pid}.log`;
```
