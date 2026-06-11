# filename-case

📝 Enforce a case style for filenames and directory names.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces filenames and directory names of linted files to use a certain case style and lowercase file extension. The default is `kebabCase`.

Because this rule only inspects the path, it applies to files of any language, not just JavaScript, as long as they are linted with the matching ESLint language plugin (for example [`@eslint/css`](https://github.com/eslint/css) or [`@eslint/markdown`](https://github.com/eslint/markdown)).

Directory names are checked only when the file is inside the current working directory. Files outside the current working directory only have their filename checked.

Files named `index.js`, `index.mjs`, `index.cjs`, `index.ts`, `index.tsx`, `index.vue` are ignored as they can't change case (only a problem with `pascalCase`). Their parent directories are still checked.

Characters other than `a-z`, `A-Z`, `0-9`, `-`, and `_` are ignored for casing and kept as-is in suggested names.

The case check ignores path segments starting with `$`, as they are commonly used for route parameters.

Set the `checkDirectories` option to `false` to only check filenames.

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
- `FAQPage.js`
- `FooBar.Test.js`
- `FooBar.TestUtils.js`

## Options

### case

Type: `string`

You can set the `case` option like this:

```js
'unicorn/filename-case': [
	'error',
	{
		case: 'kebabCase',
	},
]
```

### cases

Type: `{[type: string]: boolean}`

You can set the `cases` option to allow multiple cases:

```js
'unicorn/filename-case': [
	'error',
	{
		cases: {
			camelCase: true,
			pascalCase: true,
		},
	},
]
```

### ignore

Type: `Array<string | RegExp>`\
Default: `[]`

Path segments to ignore. If any path segment matches, the file is ignored.

When a string is given, it's interpreted as a regular expression.

Sometimes you may have non-standard filenames or directory names in a project. This option lets you ignore those files or directories.

For example:

- Vendor packages that are copied into the project.
- Ignore some files when you use [eslint-plugin-markdown](https://github.com/eslint/eslint-plugin-markdown), for example `README.md`.
- Some tools may require special names for some files.
- Ignore a directory and everything in it.

Don't forget that you must escape special characters that you don't want to be interpreted as part of the regex, for example, if you have `[` in the actual path segment. For example, to match `[id].js`, use `/^\[id]\.js$/` or `'^\\[id]\\.js$'`.

```js
'unicorn/filename-case': [
	'error',
	{
		case: 'kebabCase',
		ignore: [
			'^FOOBAR\\.js$',
			'^vendor$',
			'^(B|b)az',
			'\\.SOMETHING\\.js$',
			/^fixtures$/i,
		],
	},
]
```

### checkDirectories

Type: `boolean`\
Default: `true`

Whether to check directory names. Filenames are always checked.

### multipleFileExtensions

Type: `boolean`\
Default: `true`

Whether to treat additional, `.`-separated parts of a filename as parts of the extension rather than parts of the filename.

Note that the parts of the filename treated as the extension will not have the filename case enforced.

This only affects filenames. When `checkDirectories` is enabled, directory names are checked as full path segments.

For example:

```js
'unicorn/filename-case': [
	'error',
	{
		case: 'pascalCase',
	},
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
'unicorn/filename-case': [
	'error',
	{
		case: 'pascalCase',
		multipleFileExtensions: false,
	},
]

// Results
✅ FooBar.Test.js
✅ FooBar.TestUtils.js
❌ FooBar.testUtils.js
❌ FooBar.test.js
❌ FooBar.test-utils.js
❌ FooBar.test_utils.js
```
