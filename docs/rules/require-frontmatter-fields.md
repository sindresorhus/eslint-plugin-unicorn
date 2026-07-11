# require-frontmatter-fields

📝 Require configured YAML frontmatter fields.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Require specified keys in a top-level YAML mapping. This is useful for Markdown collections such as blog posts or documentation pages that require consistent metadata.

The rule only checks YAML frontmatter that [`@eslint/markdown`](https://github.com/eslint/markdown#enabling-front-matter-in-both-commonmark-and-gfm) has parsed. Configure the Markdown language and enable YAML frontmatter:

```js
import markdown from '@eslint/markdown';
import unicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
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
			'unicorn/require-frontmatter-fields': [
				'error',
				{
					fields: [
						'title',
						'description',
						'date',
					],
				},
			],
		},
	},
]);
```

## Examples

YAML frontmatter contents:

```yaml
# ❌
title: Hello
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

The required keys in a top-level YAML mapping. The rule does not require frontmatter itself, so Markdown files without YAML frontmatter are ignored.

Malformed YAML frontmatter is ignored. This rule checks only field presence. It does not validate field values, nested fields, field order, TOML frontmatter, or JSON frontmatter.
