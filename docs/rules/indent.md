# indent

📝 Enforce consistent indentation in JSON and CSS.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce leading indentation in JSON, JSONC, and JSON5 ([`@eslint/json`](https://github.com/eslint/json)) and CSS ([`@eslint/css`](https://github.com/eslint/css)). JSON checks nesting depth; CSS checks indentation style only.

JavaScript and TypeScript are excluded because their statements and expressions need more detailed indentation rules. Use [`@stylistic/indent`](https://eslint.style/rules/indent) for those languages.

## Options

### `indent`

Type: `'tab' | number`\
Default: `'tab'`

Use tabs, or a positive integer to set the number of spaces per indentation unit. Mixed tabs and spaces are rejected.

```js
{
	'unicorn/indent': [
		'error',
		{
			indent: 2,
		},
	],
}
```

### `tabWidth`

Type: `number`\
Default: `4`

A positive integer tab stop width for CSS conversion, whether converting to tabs or spaces. Ignored for JSON.

## Examples

### JSON

Each open object or array adds one level. A line starting with `}` or `]` uses one level less; only the first closing delimiter determines that line's indentation. Top-level content is unindented.

For `{indent: 2}`:

```json
{
  "items": [
    true
  ]
}
```

Strings and comments do not affect depth. JSON5 indentation whitespace, including non-breaking spaces, is replaced.

### CSS

Accepts any number of tabs in tab mode, or multiples of `indent` spaces in space mode. **Nesting depth is not checked**, so unindented lines are valid anywhere.

For `{indent: 2}`, both examples pass:

```css
a {
  color: red;
}

b {
color: blue;
}
```

Fixes expand tabs using tab stops, then round width up to a whole indentation unit. With defaults, four spaces become one tab, five become two tabs, and a space followed by a tab becomes one tab. With `{indent: 2, tabWidth: 4}`, a tab followed by a space becomes six spaces.

Only ASCII spaces and tabs are treated as indentation. Unicode identifier characters, including non-breaking spaces, are preserved.

## Preserved content

Preserves inline spacing, trailing whitespace, line endings, and non-whitespace token contents. Ignores blank lines and continuation lines inside multiline tokens and comments. Indentation before comment openers is checked.
