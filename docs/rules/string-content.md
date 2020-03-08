# Enforce better string content

Enforce certain things about the contents of strings. For example, you can enforce using `’` instead of `'` to avoid escaping. Or you could block some words. The possibilities are endless.

This rule is fixable.

*It only reports one pattern per AST node at the time.*

## Fail

```js
const foo = 'Someone\'s coming!';
```

## Pass

```js
const foo = 'Someone’s coming!';
```

## Options

Type: `object`

### patterns

Type: `object`

Extend [default patterns](#default-pattern).

The example below:

- Disables the default `'` → `’` replacement.
- Adds a custom `unicorn` → `🦄` replacement.
- Adds a custom `awesome` → `😎` replacement and a custom message.
- Adds a custom `cool` → `😎` replacement, but disables auto fix.

```json
{
	"unicorn/string-content": [
		"error",
		{
			"patterns": {
				"'": false,
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

## Default Pattern

```json
{
	"'": "’"
}
```
