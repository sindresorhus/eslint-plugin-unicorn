# prefer-unicode-code-point-escapes

📝 Prefer Unicode code point escapes over legacy escape sequences.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[Unicode code point escapes](https://mathiasbynens.be/notes/javascript-escapes#unicode-code-point) are more consistent than older escape forms. They use the actual code point value, which makes astral symbols easier to read than surrogate pairs.

Tagged templates are ignored because tags can observe their raw text. JSX attributes are ignored because backslashes are literal text there.

In strings and untagged template literals, non-printable four-digit `\uXXXX` escapes with shorter equivalents are left to [`prefer-short-escape-sequences`](prefer-short-escape-sequences.md). Regex literals continue to use code point escapes.

Regex literals without the `u` or `v` flag are reported with a suggestion instead of an autofix because adding Unicode mode can change how the rest of the regex is interpreted. The suggestion is only provided when the converted regex is still valid with the `u` flag. [`require-unicode-regexp`](https://eslint.org/docs/latest/rules/require-unicode-regexp) can enforce Unicode regex mode more broadly.

`RegExp` constructor string patterns are intentionally ignored. Safely fixing those patterns requires handling both string escaping and regex escaping.

Printable ASCII hexadecimal and Unicode escapes in strings and untagged template literals are handled by [`prefer-literal-ascii`](prefer-literal-ascii.md). This rule continues to handle them in regular expressions.

## Examples

```js
// ❌
const foo = '\xA9';
const bar = '\u2661';
const baz = '\uD83D\uDCA9';

// ✅
const foo = '\u{A9}';
const bar = '\u{2661}';
const baz = '\u{1F4A9}';
```

```js
// ❌
const foo = `\xA9${bar}\u2661`;

// ✅
const foo = `\u{A9}${bar}\u{2661}`;
```

```js
// ❌
const foo = /\u0061/u;

// ✅
const foo = /\u{61}/u;
```

```js
// ❌
const foo = /\u0061/;

// ✅
const foo = /\u{61}/u;
```
