# no-hex-escape

📝 Enforce the use of Unicode escapes instead of hexadecimal escapes.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[Unicode escapes](https://mathiasbynens.be/notes/javascript-escapes#unicode) are more consistent, readable, and standardized than [hexadecimal escapes](https://mathiasbynens.be/notes/javascript-escapes#hexadecimal). Unicode escapes clearly show they represent Unicode code points, while hex escapes are ambiguous about whether they represent bytes or code units.

Tagged template literals are ignored because tag functions can observe the raw escape sequences.

## Examples

```js
// ❌
const foo = '\x1B';

// ✅
const foo = '\u001B';
```

```js
// ❌
const foo = `\x1B${bar}`;

// ✅
const foo = `\u001B${bar}`;
```
