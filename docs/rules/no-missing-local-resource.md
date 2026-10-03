# no-missing-local-resource

📝 Disallow references to missing local resources.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🌐 `recommended-html`, 📚 `recommended-markdown`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks static local JavaScript, Markdown, HTML, and CSS resources relative to the linted file. It catches broken links, missing assets, and casing that only works on a case-insensitive filesystem.

It checks JavaScript `new URL(resource, import.meta.url)` with a string literal or a template literal without interpolations; Markdown links, images, and reference definitions; HTML `href`, `src`, `poster`, `srcset`, and `imagesrcset` attributes; and CSS `url()` resources, `image-set()` strings, and `@import` targets. Files, directories, and symlinks are valid. JavaScript, HTML, and CSS casing-only mismatches are automatically fixed.

URLs with a scheme, root-relative URLs, fragments, and configured template values are ignored. It does not infer extensions, check cross-file fragments, honor HTML `<base>`, parse raw Markdown HTML, or support percent-encoded path separators. JavaScript imports, JSX attributes, dynamic resource paths, and other URL bases are not checked. JavaScript URL strings containing tabs, carriage returns, or line feeds are ignored. Casing fixes are unavailable for Markdown, JavaScript string escapes, HTML character references, CSS escapes, and Unicode case mappings that change length.

## Examples

```js
// ❌
const logo = new URL('./assets/Logo.svg', import.meta.url);

// ✅
const logo = new URL('./assets/logo.svg', import.meta.url);
```

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
	background: url('./images/Logo.png');
}

/* ✅ */
.logo {
	background: url('./images/logo.png');
}
```

## Using non-JavaScript files

Enable the rule in Markdown, HTML, and CSS language blocks:

```js
import css from '@eslint/css';
import html from '@html-eslint/eslint-plugin';
import markdown from '@eslint/markdown';
import {defineConfig} from 'eslint/config';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
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
]);
```

Use `markdown/gfm` instead of `markdown/commonmark` for GFM files.
