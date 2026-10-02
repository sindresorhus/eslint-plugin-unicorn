# prefer-short-escape-sequences

📝 Prefer shorter alternatives to Unicode escape sequences.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer shorter spellings of `\uXXXX` escapes in JavaScript, JSON, JSONC, JSON5, and TOML strings and quoted keys. Untagged JavaScript templates are also checked. Tagged templates and JSX attributes are ignored because their raw text matters.

Common replacements include `\u000A` → `\n` and `\u0009` → `\t`. JavaScript also uses `\0` and `\v`; `\u0000` is left unchanged before an ASCII digit. Printable ASCII escapes in JavaScript, JSON, JSONC, and JSON5 are handled by [`prefer-literal-ascii`](prefer-literal-ascii.md). TOML also shortens printable escapes such as `\u002F` → `/`, and uses only escapes valid in TOML 1.0, so `\u001B` is not replaced with TOML 1.1's `\e`.

JSON, JSONC, and JSON5 receive only shorter escapes valid in JSON, regardless of filename, because `@eslint/json` does not expose the active dialect. In particular, `\u0000` and `\u000B` remain unchanged in all three variants. TOML literal strings and keys are ignored because their backslashes are not escapes.

## Examples

For JavaScript:

```js
// ❌
const text = "Line one\u000ALine two";
const template = `Line one\u000ALine two`;

// ✅
const text = "Line one\nLine two";
const template = `Line one\nLine two`;
```

For JSON and JSONC:

```jsonc
// ❌
{
	"\u0009": "Line one\u000ALine two"
}

// ✅
{
	"\t": "Line one\nLine two"
}
```

For JSON5:

```json5
// ❌
{
	message: 'Line one\u000ALine two',
}

// ✅
{
	message: 'Line one\nLine two',
}
```

For TOML basic strings:

```toml
# ❌
message = "Line one\u000ALine two"

# ✅
message = "Line one\nLine two"
```
