# require-frontmatter-fields

📝 Require configured YAML frontmatter fields.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Require specified top-level fields in YAML frontmatter. This is useful for Markdown collections such as blog posts or documentation pages that require consistent metadata.

The rule only checks YAML frontmatter that [`@eslint/markdown`](https://github.com/eslint/markdown#enabling-front-matter-in-both-commonmark-and-gfm) has parsed. Configure the Markdown language and enable YAML frontmatter:

```js
import markdown from '@eslint/markdown';
import unicorn from 'eslint-plugin-unicorn';

export default [
	{
		files: ['**/*.md'],
		plugins: {
			markdown,
			unicorn,
		},
		language: 'markdown/gfm',
		languageOptions: {
			frontmatter: 'yaml',
		},
		rules: {
			'unicorn/require-frontmatter-fields': ['error', {
				fields: ['title', 'description', 'date'],
				types: {
					title: 'string',
					description: 'string',
					date: 'string',
				},
			}],
		},
	},
];
```

## Examples

YAML frontmatter contents:

```yaml
# ❌
title: Hello
```

```yaml
# ❌
title: 1
description: A description
date: 2026-07-10
```

```yaml
# ✅
title: Hello
description: A description
date: 2026-07-10
```

## Options

### fields

Type: `string[]`\
Default: `[]`

The required top-level YAML field names. The rule does not require frontmatter itself, so Markdown files without YAML frontmatter are ignored.

### types

Type: `Record<string, 'string' | 'number' | 'boolean' | 'null'>`\
Default: `{}`

Expected primitive types for top-level fields. Fields in this option are checked when present, even if they are not included in `fields`.

```js
'unicorn/require-frontmatter-fields': ['error', {
	fields: ['title'],
	types: {
		draft: 'boolean',
	},
}]
```

This rule does not validate YAML syntax, field contents, nested fields, field order, TOML frontmatter, or JSON frontmatter.
