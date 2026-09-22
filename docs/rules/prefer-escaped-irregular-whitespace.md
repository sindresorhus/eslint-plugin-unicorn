# prefer-escaped-irregular-whitespace

📝 Prefer escape sequences for irregular whitespace characters.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Supports JavaScript, TypeScript, JSON, JSONC, JSON5, and TOML. Presets enable it only for JavaScript; enable it explicitly for other languages.

Escape irregular whitespace in strings, regular expressions, and untagged templates to make invisible characters reviewable. The character set matches ESLint's [`no-irregular-whitespace`](https://eslint.org/docs/latest/rules/no-irregular-whitespace) rule.

Comments, JSX text and quoted attributes, tagged templates, and backslash-continued U+2028/U+2029 are ignored. TOML checks only basic strings, including double-quoted keys; literal strings cannot use escapes.

Strings, untagged templates, and `u`/`v` regular expressions are autofixed. Other regular expressions are reported without a fix because adding `u` can change their meaning. JSON and TOML use four-digit escapes.

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
