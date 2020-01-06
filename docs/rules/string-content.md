# Enforce a case style for filenames


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

Type: `object`

You can extend default patterns by passing the `patterns` option.

The example below:

- disables the default `'` → `’` replacement
- add a custom `unicorn` → `🦄` replacement
- add a custom `awesome` → `😎` replacement, and a custom message
- add a custom `cool` → `😎` replacement, but disabled auto fix

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

The key of `patterns` is treat as regex, so you must escape special characters.

for example, you want add `...` → `…` replacement

```js
{
	"patterns": {
		"\\.\\.\\.": "…"
	}
}
```
