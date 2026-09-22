# prefer-escaped-irregular-whitespace

📝 Prefer escape sequences for irregular whitespace characters.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Supports JavaScript, TypeScript, JSON, JSONC, JSON5, and TOML. The presets are for JavaScript; enable the rule explicitly for other languages. In TOML, only basic strings, including double-quoted keys, are checked; literal strings cannot use escapes.

Escape irregular whitespace in strings, regular expressions, and untagged templates so invisible characters are easy to review without changing their meaning. The character set matches ESLint's [`no-irregular-whitespace`](https://eslint.org/docs/latest/rules/no-irregular-whitespace) rule.

Comments, JSX text and quoted attributes, and tagged templates are ignored. Tags can observe raw template text. Backslash-continued U+2028 and U+2029 are also ignored because they add no character to the value.

Strings, untagged templates, and regular expressions with the `u` or `v` flag are autofixed. Other regular expressions are reported without a fix because adding `u` can change their meaning, and four-digit escapes conflict with [`prefer-unicode-code-point-escapes`](./prefer-unicode-code-point-escapes.md). JSON and TOML fixes use four-digit escapes as required by those formats.

`no-irregular-whitespace` also checks outside literals, but can duplicate template and regex reports. Its `skipTemplates` and `skipRegExps` options avoid that overlap, leaving tagged templates unchecked. [`regexp/no-invisible-character`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-invisible-character.html) also overlaps, but covers string-literal `RegExp` constructors and fixes regular expressions without Unicode mode.

## Examples

```js
// ❌
const nonBreakingSpace = ' ';
// ✅
const nonBreakingSpace = '\u{A0}';
```

```js
// ❌
const zeroWidthSpacePattern = /​/u;
// ✅
const zeroWidthSpacePattern = /\u{200B}/u;
```

```js
// ❌
const narrowNoBreakSpace = ` `;
// ✅
const narrowNoBreakSpace = `\u{202F}`;
```
