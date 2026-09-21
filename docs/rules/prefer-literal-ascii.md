# prefer-literal-ascii

📝 Prefer literal printable ASCII characters over escape sequences.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer literal printable ASCII (U+0020–U+007E) over numeric escapes in JavaScript strings and untagged templates, and in JSON, JSONC, and JSON5 strings and quoted keys. This covers each language's valid `\xXX`, `\uXXXX`, and `\u{X…}` escapes. Quotes, backslashes, and template delimiters stay escaped when needed.

In JSON, JSONC, and JSON5, `\/` becomes `/`. For `\/` in JavaScript, use ESLint's [`no-useless-escape`](https://eslint.org/docs/latest/rules/no-useless-escape). Tagged templates, regex literals, and JSX attribute strings are ignored. Use [`prefer-unicode-code-point-escapes`](prefer-unicode-code-point-escapes.md) for other legacy escapes.

Autofix is omitted for directive prologues, digits that would extend a preceding `\0` or legacy octal escape, and TypeScript template literal types without substitutions when they contain a literal backslash. In HTML-embedded content, making `<` or `/` literal may affect HTML parsing.

## Examples

```js
// ❌
const letter = '\x41';
const word = '\u0042\u{43}';
const template = `\u0024\u007Bvalue}`;

// ✅
const letter = 'A';
const word = 'BC';
const template = `\${value}`;
```
