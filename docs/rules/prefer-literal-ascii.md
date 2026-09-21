# prefer-literal-ascii

📝 Prefer literal printable ASCII characters over numeric escape sequences.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Numeric escapes can obscure ordinary printable characters. This rule replaces `\xXX`, `\uXXXX`, and `\u{X…}` escapes in JavaScript string literals and untagged template literals for printable ASCII code points from U+0020 through U+007E with their literal characters.

Characters that need escaping for JavaScript syntax, such as the surrounding quote, backslash, and template literal delimiters, are kept escaped using their conventional short form.

Tagged template literals are ignored because tag functions can observe the raw escape sequences. Regular expressions are also ignored because their escape semantics differ from strings. JSX attribute strings are ignored because JSX does not interpret JavaScript escape sequences in them.

Directive prologues are reported but not automatically fixed because replacing an escape can turn a plain string expression into a directive and change runtime behavior. A fix is also omitted when a literal digit would extend a preceding `\0` or legacy octal escape.

This rule intentionally does not report `\/` in JavaScript. Use ESLint's [`no-useless-escape`](https://eslint.org/docs/latest/rules/no-useless-escape) rule for that. If this rule gains JSON support later, it can report `\/` there because JSON permits the escape.

Use the [`prefer-unicode-code-point-escapes`](prefer-unicode-code-point-escapes.md) rule for other legacy escapes.

Autofixes assume standalone JavaScript syntax. If JavaScript is embedded directly in HTML, materializing a character such as `<` may affect how the surrounding HTML is parsed.

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
