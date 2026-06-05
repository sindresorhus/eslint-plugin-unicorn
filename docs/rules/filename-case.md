# filename-case

📝 Enforce a case style for filenames and directory names.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces all path segments of linted files to have their names in a certain case style and lowercase file extension. The default is `kebabCase`.

Directory names are checked only when the file is inside the current working directory. Files outside the current working directory only have their filename checked.

Files named `index.js`, `index.mjs`, `index.cjs`, `index.ts`, `index.tsx`, `index.vue` are ignored as they can't change case (Only a problem with `pascalCase`). Their parent directories are still checked.

Characters other than `a-z`, `A-Z`, `0-9`, `-`, and `_` are ignored for casing and kept as-is in suggested filenames.

The case check ignores path segments starting with `$`, as they are commonly used for route parameters.

## Cases

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

Path segments to ignore. If any path segment matches, the file is ignored.

When a string is given, it's interpreted as a regular expressions inside a string. Needed for ESLint config in JSON.

Sometimes you may have non-standard filenames or directory names in a project. This option lets you ignore those files.

For example:

- Vendor packages that are not published and was copy-pasted.
- Ignore some files when you use [eslint-plugin-markdown](https://github.com/eslint/eslint-plugin-markdown), for example `README.md`.
- Some tools may require special names for some files.
- Ignore a directory and everything in it.

Don't forget that you must escape special characters that you don't want to be interpreted as part of the regex, for example, if you have `[` in the actual filename. For example, to match `[id].js`, use `/^\[id]\.js$/` or `'^\\[id]\\.js$'`.

```js
"unicorn/filename-case": [
	"error",
	{
		"case": "kebabCase",
		"ignore": [
			"^FOOBAR\\.js$",
			"^vendor$",
			"^(B|b)az",
			"\\.SOMETHING\\.js$",
			/^fixtures$/i
		]
	}
]
```

### multipleFileExtensions

Type: `boolean`\
Default: `true`

Whether to treat additional, `.`-separated parts of a filename as parts of the extension rather than parts of the filename.

Note that the parts of the filename treated as the extension will not have the filename case enforced.

This only affects filenames. Directory names are always checked as full path segments.

For example:

```js
"unicorn/filename-case": [
	"error",
	{
		"case": "pascalCase"
	}
]

// Results
✅ FooBar.Test.js
✅ FooBar.TestUtils.js
✅ FooBar.testUtils.js
✅ FooBar.test.js
✅ FooBar.test-utils.js
✅ FooBar.test_utils.js
```

```js
"unicorn/filename-case": [
	"error",
	{
		"case": "pascalCase",
		"multipleFileExtensions": false
	}
]

// Results
✅ FooBar.Test.js
✅ FooBar.TestUtils.js
❌ FooBar.testUtils.js
❌ FooBar.test.js
❌ FooBar.test-utils.js
❌ FooBar.test_utils.js
```
