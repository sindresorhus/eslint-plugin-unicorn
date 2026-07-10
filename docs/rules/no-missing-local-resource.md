# no-missing-local-resource

📝 Disallow references to missing local resources.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks whether static local resources in Markdown and HTML resolve from the directory containing the linted file. It catches broken documentation links, missing assets, and path casing that passes on a case-insensitive filesystem but fails on a case-sensitive deployment.

It checks Markdown links, images, and reference definitions, plus HTML `href`, `src`, `poster`, and `srcset` attributes. Files, directories, and symlinks are all valid targets. An HTML casing-only mismatch is automatically fixed.

URLs with a scheme, root-relative URLs, fragments, and dynamic HTML template values are ignored. The rule does not infer extensions, check fragments in other files, honor HTML `<base>` elements, or parse raw HTML embedded in Markdown. Casing fixes are not applied in Markdown or when HTML character references are present.

## Examples

```md
<!-- ❌ -->
[Guide](./does-not-exist.md)
![Logo](./assets/Logo.svg)

<!-- ✅ -->
[Guide](./guide.md)
![Logo](./assets/logo.svg)
```

```html
<!-- ❌ -->
<img src="./images/missing.png" srcset="./images/logo-small.png 1x, ./images/missing-large.png 2x">

<!-- ✅ -->
<img src="./images/logo.png" srcset="./images/logo-small.png 1x, ./images/logo-large.png 2x">
```

## Using non-JavaScript files

Enable the rule in the language blocks that lint your Markdown and HTML files:

```js
import html from '@html-eslint/eslint-plugin';
import markdown from '@eslint/markdown';
import unicorn from 'eslint-plugin-unicorn';

export default [
	{
		files: ['**/*.md'],
		plugins: {
			markdown,
			unicorn,
		},
		language: 'markdown/commonmark',
		rules: {
			'unicorn/no-missing-local-resource': 'error',
		},
	},
	{
		files: ['**/*.html'],
		plugins: {
			html,
			unicorn,
		},
		language: 'html/html',
		rules: {
			'unicorn/no-missing-local-resource': 'error',
		},
	},
];
```

Use `markdown/gfm` instead of `markdown/commonmark` for GFM files.
