# indent

📝 Enforce consistent indentation in JSON and CSS.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce a configured indentation style in JSON, JSONC, JSON5, and CSS files. This rule only changes leading whitespace. It preserves existing line breaks, inline spacing, and trailing whitespace.

JSON indentation follows object and array nesting. CSS indentation checks only the indentation characters and width multiples, **not nesting depth**.

This rule is opt-in. Enable it in configurations using `json/json`, `json/jsonc`, `json/json5`, or `css/css` from `@eslint/json` or `@eslint/css`.

## Options

```js
{
	'unicorn/indent': ['error', {
		indent: 'tab',
		tabWidth: 4,
	}],
}
```

### `indent`

Type: `'tab' | number`\
Default: `'tab'`

Use `'tab'` for tabs, or a positive integer for the number of spaces per indentation unit. Mixing spaces and tabs is not allowed.

```js
{
	'unicorn/indent': ['error', {indent: 2}],
}
```

### `tabWidth`

Type: `number`\
Default: `4`

A positive integer specifying the distance between tab stops when converting CSS indentation. It applies when converting either to tabs or to spaces. JSON ignores this option because nesting determines its exact indentation.

## Examples

### JSON

Each open object or array adds one indentation unit. A line starting with `}` or `]` is indented one unit less. When several closing delimiters share a line, the first determines that line's indentation. Top-level content has no indentation.

For `{indent: 2}`:

```json
{
  "items": [
    {
      "value": true
    }
  ]
}
```

Inline containers stay inline. Braces and brackets inside strings and comments do not affect depth. JSON5's additional whitespace characters, such as non-breaking spaces, are replaced when used as indentation.

### CSS

In tab mode, any number of tabs is valid. In space mode, indentation must contain a multiple of the configured number of spaces. Unindented lines are valid at any nesting depth. This deliberately avoids prescribing alignment for selectors, at-rules, and multiline values.

For `{indent: 2}`, both examples pass:

```css
a {
  color: red;
}

b {
color: blue;
}
```

Autofixes calculate the indentation's visual width using `tabWidth`, then round upward to the next whole indentation unit. With the default options, four spaces become one tab and five spaces become two tabs. A space followed by a tab has width four, not five. With `{indent: 2, tabWidth: 4}`, a tab followed by a space becomes six spaces.

Only ASCII spaces and tabs are indentation in CSS. Non-breaking spaces and other Unicode identifier characters are preserved because replacing them could change selector meaning.

## Preserved content

Whitespace-only lines and continuation lines inside multiline strings, comments, URLs, or other tokens are ignored. Indentation before a comment opener is checked, but comment contents are preserved. Escaped characters within tokens are never modified.

Line boundaries follow the parser: LF, CRLF, and CR, plus form feed in CSS. JSON5's Unicode line and paragraph separators (`U+2028` and `U+2029`) are not recognized as line boundaries by the parser. Indentation prefixes containing them are left untouched.

## Related rules

- [`jsonc/indent`](https://ota-meshi.github.io/eslint-plugin-jsonc/rules/indent.html) offers more indentation options and experimental compatibility with `@eslint/json`.
- [`css-stylistic/indentation`](https://github.com/KazariEX/eslint-plugin-css-stylistic) checks CSS depth and provides additional alignment options.
- [`json-canonical/pretty-format`](https://github.com/ExaDev/eslint-plugin-json-canonical) formats entire JSON documents, including line breaks.
- [`template-indent`](./template-indent.md) handles selected JavaScript template literals, which this rule does not check.

Disable this rule where another formatter or indentation rule enforces a conflicting layout.
