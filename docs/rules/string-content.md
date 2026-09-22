# string-content

📝 Enforce better string content.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce certain things about the contents of strings. For example, you can enforce using `’` instead of `'` to avoid escaping. Or you could block some words. The possibilities are endless.

_It only reports one pattern per AST node at the time._

This rule ignores the following tagged template literals as they're known to contain code:

- ``gql`…` ``
- ``html`…` ``
- ``sql`…` ``
- ``svg`…` ``
- ``styled.*`…` ``

**This rule has no effect by default. You need to set [`patterns`](#patterns) to check string content.**

## Examples

```js
/* eslint unicorn/string-content: ["error", { "patterns": { "'": "’" } }] */

// ❌
const foo = 'Someone\'s coming!';

// ✅
const foo = 'Someone’s coming!';
```

## TOML

This rule also supports string values in TOML files when linting with [`eslint-plugin-toml`](https://github.com/ota-meshi/eslint-plugin-toml). Patterns match decoded content in basic, literal, and multiline strings. Keys and comments are not checked.

Fixes and suggestions write double-quoted basic strings with TOML-compatible escaping, including when the original is a literal or multiline string. Replacements containing unpaired Unicode surrogates are reported without a fix or suggestion because TOML cannot represent them.

```js
'unicorn/string-content': ['error', {patterns: {unicorn: '🦄'}}]
```

```toml
# ❌
name = 'unicorn'

# ✅
name = "🦄"
```

## Other languages

In JSON, JSONC, and JSON5, patterns match decoded string values and quoted keys, but not unquoted JSON5 keys. Fixes use JSON-compatible double quotes.

In CSS, patterns match decoded strings and `url()` values, including quoted selectors and font families. Unquoted identifiers, comments, and custom property values are skipped. Fixes use CSS-compatible double quotes; URLs containing comments and replacements with null characters or unpaired surrogates are reported without a fix or suggestion.

In YAML, patterns match decoded string values and keys in plain or quoted scalars, including anchored scalars. Block scalars, tagged scalars, and aliases are skipped. Fixes use YAML-compatible double quotes; unpaired surrogates are reported without a fix. Use `YAMLScalar` selectors to limit checks.

## Options

Type: `object`

### patterns

Type: `object`

The example below:

- Adds a custom `unicorn` → `🦄` replacement.
- Adds a custom `awesome` → `😎` replacement and a custom message.
- Adds a custom `cool` → `😎` replacement, but disables auto fix.

```js
'unicorn/string-content': [
	'error',
	{
		patterns: {
			unicorn: '🦄',
			awesome: {
				suggest: '😎',
				message: 'Please use `😎` instead of `awesome`.',
			},
			cool: {
				suggest: '😎',
				fix: false,
			},
		},
	},
]
```

Set `caseSensitive` to `false` to match regardless of case:

```js
'unicorn/string-content': [
	'error',
	{
		patterns: {
			'end of day': {
				suggest: 'EOD',
				caseSensitive: false,
			},
		},
	},
]
```

The key of `patterns` is treated as a regex, so you must escape special characters.

For example, if you want to enforce `...` → `…`:

```js
{
	patterns: {
		'\\.\\.\\.': '…',
	},
}
```

### selectors

Type: `string[]`
Default: `[]`

Only check string nodes matching one of these [ESLint selectors](https://eslint.org/docs/latest/extend/selectors). When empty, all supported string nodes are checked.

The selector must match the string node itself: `Literal` for JavaScript string literals, `TemplateElement` for template literal content, `TOMLValue[kind="string"]` for TOML string values, `YAMLScalar` for YAML scalars, `String` for JSON or CSS strings, or `Url` for CSS URLs.

```js
'unicorn/string-content': [
	'error',
	{
		patterns: {
			'\\.\\.\\.': '…',
		},
		selectors: [
			'VariableDeclarator[id.name="description"] > Literal',
			'Property[key.name="description"] > Literal',
		],
	},
]
```

## Pattern ideas

- Enforce `’` over `'` to avoid escape.
- Enforce `…` over `...` for better typography.
- Enforce `→` over `->` for better typography.
- Enforce `^https:\\/\\/` over `^http:\\/\\/` to secure your links.
