# single-line-block-comment-style

📝 Enforce a consistent style for single-line block comments.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces a consistent layout for standalone block comments whose content occupies one line. It supports both ordinary block comments and documentation comments.

Comments with multiple content lines, block comments placed beside code, and common tooling directive comments are ignored by default. This includes ESLint, TypeScript, formatter, coverage, and minifier directives. Documentation comments with asterisk prefixes are also ignored. License comments beginning with `/*!` are ignored as well.

## Examples

The default option is `'multiline'`:

```js
// ❌
/** Get the value. */
/* Get the value. */

// ✅
/**
Get the value.
*/
/*
Get the value.
*/
```

## Options

Type: `'multiline' | 'single-line'`\
Default: `'multiline'`

Available options:

- `'multiline'` - Require the comment delimiters to be on separate lines.
- `'single-line'` - Require the comment to fit on one line.

With the `'single-line'` option:

```js
/* eslint unicorn/single-line-block-comment-style: ['error', 'single-line'] */

// ❌
/**
Get the value.
*/

// ✅
/** Get the value. */
```

### `ignore`

Type: `Array<string | RegExp>`\
Default: `[]`

Regular expressions to ignore. Strings are interpreted as regular expressions. Patterns are matched anywhere in the comment text after removing its delimiters and any documentation comment asterisk prefixes, unless anchored with `^` or `$`.

```js
'unicorn/single-line-block-comment-style': [
	'error',
	'multiline',
	{
		ignore: [
			'^Generated',
			/^License:/u,
		],
	},
]
```

With `ignore: ['^Generated']`:

```js
// ✅
/* Generated comment. */

// ❌
/* This comment is not ignored. */
```

Documentation comment asterisk prefixes are left unchanged to avoid changing their meaning.
