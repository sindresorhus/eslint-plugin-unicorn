# no-missing-local-resource

📝 Disallow references to missing local resources.

🚫 Disabled by default.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks static local JavaScript, Markdown, HTML, and CSS resources relative to the linted file. It catches broken links, missing assets, and casing that only works on a case-insensitive filesystem.

The project root is the linted file's nearest Git repository root, or ESLint's working directory if the file is outside a Git repository. The rule uses the normalized path without resolving symlinks and skips paths outside this root. This includes relative links such as `../../issues/new` that point to GitHub pages outside the checkout.

It checks JavaScript `new URL(resource, import.meta.url)` with a string literal or a template literal without interpolations; Markdown links, images, and reference definitions; HTML `href`, `src`, `poster`, `srcset`, and `imagesrcset` attributes; and CSS `url()` resources, `image-set()` strings, and `@import` targets. Files and directories are valid, including those reached through symlinks. JavaScript, HTML, and CSS casing-only mismatches are automatically fixed.

URLs with a scheme, root-relative URLs, fragments, and configured template values are ignored. It does not infer extensions, check cross-file fragments, honor HTML `<base>`, parse raw Markdown HTML, or support percent-encoded path separators. JavaScript imports, JSX attributes, dynamic resource paths, and other URL bases are not checked. JavaScript URL strings containing tabs, carriage returns, or line feeds are ignored. Casing fixes are unavailable for Markdown, JavaScript string escapes, HTML character references, CSS escapes, and Unicode case mappings that change length.

If a resource exists only after dependency installation, a build, or at run time, lint after it exists or add its path to [`ignore`](#ignore).

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

## Options

### `ignore`

Glob patterns for resource paths to skip, such as files a build creates. The default is `[]`.

Patterns match the decoded, normalized path relative to the project root. Matching is case-sensitive and ignores URL queries and fragments. Use `/` as the separator and omit leading `./` and trailing `/`. Include the leading dot in a hidden name, as in `.ai-temporary/**`. Use `dist/**` for paths inside `dist` and `dist` for the directory itself.

```js
{
	'unicorn/no-missing-local-resource': ['error', {ignore: ['dist/**', '.ai-temporary/**', 'site/options.js']}],
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
