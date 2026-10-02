# comma-spacing

📝 Enforce consistent spacing before and after commas in JSON.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces no whitespace before commas and exactly one ASCII space after commas on the same line in JSON, JSONC, and JSON5 using [`@eslint/json`](https://github.com/eslint/json).

Line breaks and the whitespace around them are preserved, including comma-first layouts. Whitespace after a trailing comma immediately before `]` or `}` is ignored, but whitespace before the comma is still checked.

Comments are treated as adjacent tokens: whitespace between a comma and a comment is checked, while comment contents and whitespace on the other side of the comment are preserved. For example, `[1,/* comment */]` is fixed to `[1, /* comment */]`, even though the comma is trailing. Commas inside strings and comments are ignored.

This rule has no options and is disabled by default. It does not support JavaScript or the languages provided by `eslint-plugin-jsonc`. Unlike [`@stylistic/comma-spacing`](https://eslint.style/rules/comma-spacing), which accepts one or more spaces, this rule requires exactly one space.

## Examples

### Incorrect

```json
[1 ,2,  3]
```

```json
{"first": 1,"second": 2}
```

### Correct

```json
[1, 2, 3]
```

```json
{"first": 1, "second": 2}
```

```jsonc
[1, /* Keep comment */2]
```

```json5
[1, 2,]
```

## Usage

```js
import json from '@eslint/json';
import unicorn from 'eslint-plugin-unicorn';

export default [
	{
		files: ['**/*.json'],
		plugins: {json, unicorn},
		language: 'json/json',
		rules: {
			'unicorn/comma-spacing': 'error',
		},
	},
];
```

For JSONC or JSON5 files, use the corresponding file pattern and `language: 'json/jsonc'` or `language: 'json/json5'`. JSONC trailing commas require `languageOptions: {allowTrailingCommas: true}`.
