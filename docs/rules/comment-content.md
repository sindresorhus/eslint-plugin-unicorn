# comment-content

📝 Enforce better comment content.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces curated replacements in comments. It is useful for common name, brand, and acronym casing corrections such as `nodejs` → `Node.js`, and for project-specific prose preferences.

This rule is not a spellchecker. It only checks known replacement patterns.

It only reports one replacement per comment at a time.

It focuses on prose-like comment text and skips obvious non-prose regions such as code snippets, links, paths, structured data, and command examples.

## Examples

```js
// ❌
// nodejs uses javascript.

// ✅
// Node.js uses JavaScript.
```

```js
// ❌
// See the github issue.

// ✅
// See the GitHub issue.
```

```js
// ❌
// The application stores png files.

// ✅
// The app stores PNG files.
```

## Options

Type: `object`

### checkUniformCase

Type: `boolean`\
Default: `true`

By default, the rule re-cases matching tokens regardless of their case, including all-lowercase (`json`) and all-uppercase (`JSON`) ones.

Pass `checkUniformCase: false` to only correct tokens that already mix upper- and lower-case, such as `Github` → `GitHub`. All-lowercase and all-uppercase tokens are then left alone, as their casing is often intentional. Replacements that change the actual letters (such as `application` → `app`, or your own typo fixes) still apply regardless of case.

```js
'unicorn/comment-content': [
	'error',
	{
		checkUniformCase: false,
	},
]
```

### replacements

Type: `object`

You can extend the default replacements by passing the `replacements` option.

The key is treated as a regex. By default, custom replacements are case-sensitive.

```js
'unicorn/comment-content': [
	'error',
	{
		replacements: {
			'\\bteh\\b': 'the',
			'\\bto do\\b': {
				replacement: 'TODO',
				caseSensitive: false,
			},
			'\\bnode\\.?js\\b': false,
		},
	},
]
```

### extendDefaultReplacements

Type: `boolean`\
Default: `true`

Pass `extendDefaultReplacements: false` to override the default replacements completely.

```js
'unicorn/comment-content': [
	'error',
	{
		extendDefaultReplacements: false,
		replacements: {
			'\\bteh\\b': 'the',
		},
	},
]
```
