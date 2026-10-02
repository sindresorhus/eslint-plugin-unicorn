# no-leading-empty-lines

📝 Disallow empty lines at the beginning of a file.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow empty lines at the beginning of a file. A line is empty when it contains only spaces or tabs followed by an LF, CRLF, or CR line ending. The rule has no options.

This rule works across file types, including JavaScript, TypeScript, CSS, HTML, JSON, JSONC, JSON5, Markdown, TOML, and YAML. It supports native ESLint languages such as [`@eslint/json`](https://github.com/eslint/json).

The fix removes all complete leading empty lines in one edit. It preserves the first content line's indentation, the byte order mark (BOM), and everything after the leading empty lines, including comments and blank lines inside multiline strings. Empty files and whitespace-only files without a line ending are allowed.

Named virtual files created by processors, such as fenced code blocks in Markdown, are ignored. Processor output that retains the physical file's name is checked.

## Examples

These files fail:

```json

{"value": 1}
```

```yaml


# Configuration
value: 1
```

These files pass:

```json
{"value": 1}
```

```yaml
# Configuration

value: 1
```
