# Enforce better string content

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE -->
🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

Enforce certain things about the contents of strings. For example, you can enforce using `’` instead of `'` to avoid escaping. Or you could block some words. The possibilities are endless.

*It only reports one pattern per AST node at the time.*

This rule ignores the following tagged template literals as they're known to contain code:

- ``gql`…` ``
- ``html`…` ``
- ``svg`…` ``
- ``styled.*`…` ``

**This rule has no effect by default. You need set [`patterns`](#patterns) to check string content.**

## Fail

```js
/*eslint unicorn/string-content: ["error", { "patterns": { "'": "’" } }]*/
const foo = 'Someone\'s coming!';
```

## Pass

```js
/*eslint unicorn/string-content: ["error", { "patterns": { "'": "’" } }]*/
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
