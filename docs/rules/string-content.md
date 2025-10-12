# Enforce better string content

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce certain things about the contents of strings. For example, you can enforce using `’` instead of `'` to avoid escaping. Or you could block some words. The possibilities are endless.

_It only reports one pattern per AST node at the time._

This rule ignores the following tagged template literals as they're known to contain code:

- ``gql`…` ``
- ``html`…` ``
- ``svg`…` ``
- ``styled.*`…` ``

**This rule has no effect by default. You need set [`patterns`](#patterns) to check string content.**

## Examples

```js
/* eslint unicorn/string-content: ["error", { "patterns": { "'": "’" } }] */

// ❌
const foo = 'Someone\'s coming!';

// ✅
const foo = 'Someone’s coming!';
```

## Options

Type: `object`

### patterns

Type: `object`

The example below:

- Adds a custom `unicorn` → `🦄` replacement.
- Adds a custom `awesome` → `😎` replacement and a custom message.
- Adds a custom `cool` → `😎` replacement, but disables auto fix.

```json
{
	"unicorn/string-content": [
		"error",
		{
			"patterns": {
				"unicorn": "🦄",
				"awesome": {
					"suggest": "😎",
					"message": "Please use `😎` instead of `awesome`."
				},
				"cool": {
					"suggest": "😎",
					"fix": false
				}
			}
		}
	]
}
```

The key of `patterns` is treated as a regex, so you must escape special characters.

For example, if you want to enforce `...` → `…`:

```json
{
	"patterns": {
		"\\.\\.\\.": "…"
	}
}
```

## Pattern ideas

- Enforce `’` over `'` to avoid escape.
- Enforce `…` over `...` for better typography.
- Enforce `→` over `->` for better typography.
- Enforce `^https:\\/\\/` over `^http:\\/\\/` to secure your links.
