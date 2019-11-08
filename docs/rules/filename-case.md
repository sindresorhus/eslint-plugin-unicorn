# Enforce a case style for filenames

Enforces all linted files to have their names in a certain case style. The default is `kebabCase`.

Files named `index.js` are ignored as they can't change case (Only a problem with `pascalCase`).

Characters in the filename except `a-z`, `A-Z`, `0-9`, `-`, `_` and `$` are ignored.

### `kebabCase`

- `foo-bar.js`
- `foo-bar.test.js`
- `foo-bar.test-utils.js`

### `camelCase`

- `fooBar.js`
- `fooBar.test.js`
- `fooBar.testUtils.js`

### `snakeCase`

- `foo_bar.js`
- `foo_bar.test.js`
- `foo_bar.test_utils.js`

### `pascalCase`

- `FooBar.js`
- `FooBar.Test.js`
- `FooBar.TestUtils.js`


## Options

### case

You can set the `case` option like this:

```js
"unicorn/filename-case": [
	"error",
	{
		"case": "kebabCase"
	}
]
```

### cases

You can set the `cases` option to allow multiple cases:

```js
"unicorn/filename-case": [
	"error",
	{
		"cases": {
			"camelCase": true,
			"pascalCase": true
		}
	}
]
```

### ignore

An array of RegExp to ignore. It’s set to [] by default. If provided, it must be an Array.

```js
"unicorn/filename-case": [
	"error",
	{
		"case": "kebabCase",
		"ignore": ["FOOBAR\\.js", '^(B|b)az', '\\.SOMETHING\\.js']
	}
]
```
