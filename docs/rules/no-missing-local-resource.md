# no-missing-local-resource

📝 Disallow references to missing local resources.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks static local Markdown, HTML, and CSS resources relative to the linted file. It catches broken links, missing assets, and casing that only works on a case-insensitive filesystem.

It checks Markdown links, images, and reference definitions; HTML `href`, `src`, `poster`, and `srcset` attributes; and CSS `url()` values and `@import` targets. Files, directories, and symlinks are valid. HTML and CSS casing-only mismatches are automatically fixed.

URLs with a scheme, root-relative URLs, fragments, and configured template values are ignored. It does not infer extensions, check cross-file fragments, honor HTML `<base>`, parse raw Markdown HTML, or support percent-encoded path separators. Casing fixes are unavailable for Markdown, HTML character references, and CSS escapes.

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

```css
/* ❌ */
.logo {
	background: url("./images/Logo.png");
}

/* ✅ */
.logo {
	background: url("./images/logo.png");
}
```

## Using non-JavaScript files

Enable the rule in Markdown, HTML, and CSS language blocks:

```js
import css from '@eslint/css';
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
	{
		files: ['**/*.css'],
		plugins: {
			css,
			unicorn,
		},
		language: 'css/css',
		rules: {
			'unicorn/no-missing-local-resource': 'error',
		},
	},
];
```

Use `markdown/gfm` instead of `markdown/commonmark` for GFM files.
