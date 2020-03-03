# Enforce better string context

This rule is fixable.

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

### `patterns`

Type: `object`\

Extend [default patterns](#default-pattern).

The example below:

- disables the default `'` → `’` replacement
- adds a custom `unicorn` → `🦄` replacement
- adds a custom `awesome` → `😎` replacement and a custom message
- adds a custom `cool` → `😎` replacement, but disables auto fix

```json
{
	"unicorn/string-context": [
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
				},
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
