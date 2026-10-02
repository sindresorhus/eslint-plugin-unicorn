# no-empty-link-text

📝 Disallow empty link text in Markdown.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Embedded HTML is intentionally outside this rule's content analysis. -->

Disallow empty or whitespace-only labels in inline and reference links. Text, including formatted text and inline code, and non-whitespace image alternative text count as content. Decorative images are allowed alongside text.

Character references such as `&nbsp;` are decoded in text and image alternative text, but remain literal in code and math. GFM footnote markers count as content. Inline math is checked when `languageOptions.math` is enabled.

Links containing embedded HTML are ignored because their accessible content cannot be determined reliably. Standalone images, reference definitions, and code blocks are not checked.

Destinations and titles do not count as label content. [`markdown/no-empty-links`](https://github.com/eslint/markdown/blob/main/docs/rules/no-empty-links.md) checks destinations.

## Usage

Enable this rule explicitly for Markdown files. Unicorn's presets target JavaScript files.

```js
import markdown from '@eslint/markdown';
import unicorn from 'eslint-plugin-unicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
	{
		files: ['**/*.md'],
		plugins: {markdown, unicorn},
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
