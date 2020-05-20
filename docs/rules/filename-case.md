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

Type: `string`

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

Type: `{[type: string]: boolean}`

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

Type: `Array<string | RegExp>`\
Default: `[]`

Filenames to ignore.

When a string is given, it's interpreted as a regular expressions inside a string. Needed for ESLint config in JSON.

Sometimes you may have non-standard filenames in a project. This option lets you ignore those files.

For example:
- Vendor packages that are not published and was copy-pasted.
- Ignore some files when you use [eslint-plugin-markdown](https://github.com/eslint/eslint-plugin-markdown), for example `README.md`.
- Some tools may require special names for some files.

Don't forget that you must escape special characters that you don't want to be interpreted as part of the regex, for example, if you have `[` in the actual filename. For example, to match `[id].js`, use `/^\[id\]\.js$/"` or `'^\\[id\\]\\.js$'`.

```js
"unicorn/filename-case": [
	"error",
	{
		"case": "kebabCase",
		"ignore": [
			"^FOOBAR\\.js$",
			"^(B|b)az",
			"\\.SOMETHING\\.js$",
			/^vendor/i
		]
	}
]
```
