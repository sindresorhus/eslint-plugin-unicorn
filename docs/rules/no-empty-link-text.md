# no-empty-link-text

📝 Disallow empty link text in Markdown.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Embedded HTML is intentionally outside this rule's content analysis. -->

Disallow Markdown links whose labels contain no non-whitespace content. Empty link labels make links difficult to discover and identify.

The rule checks inline links and reference links. Text inside emphasis, strong emphasis, GFM strikethrough, and inline code counts as content. Character references in text and image alternative text are checked after decoding, so `&nbsp;` alone does not count as content. Inside inline code and math, character references remain literal text and count as content.

Inline math is checked when the Markdown parser's `math` language option is enabled. GFM footnote references count as content because they render a reference marker.

Linked images count as content when their alternative text contains non-whitespace characters. A linked image with empty alternative text is allowed when the link also contains text. Link destinations and titles do not count as label content.

Links containing embedded HTML are ignored because their accessible content cannot be determined reliably. Standalone images, reference definitions, and Markdown syntax inside code blocks are not checked.

## Usage

Enable this rule explicitly for Markdown files. Unicorn's presets target JavaScript files.

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
		language: 'markdown/commonmark',
		rules: {
			'unicorn/no-empty-link-text': 'error',
		},
	},
]);
```

Use `markdown/gfm` instead of `markdown/commonmark` for GFM files.

## Examples

```md
<!-- ❌ -->
[](https://example.com)
[   ](https://example.com)
[&nbsp;](https://example.com)
[![](badge.svg)](https://example.com)
[ ][destination]

<!-- ✅ -->
[Website](https://example.com)
[*Website*](https://example.com)
[`website`](https://example.com)
[![Build status](badge.svg)](https://example.com)
[![](icon.svg) Website](https://example.com)
[Website][destination]

[destination]: https://example.com
```
