# no-duplicate-font-family-names

📝 Disallow duplicate font family names.

💼🚫 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): 🎨✅ `css/recommended`, 🎨☑️ `css/unopinionated`. This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Duplicate font family names do not provide another fallback and usually indicate an editing mistake.

This rule checks the `font-family` property and statically valid `font` shorthands in style rules. It compares names case-insensitively, decodes CSS escapes, and joins unquoted identifier sequences with one space. For example, `Times New Roman`, `"times new roman"`, and `Times\20 New\20 Roman` refer to the same family. Whitespace inside quoted names or escaped identifiers remains significant.

Quoted names that look like generic families remain distinct from generic family keywords. For example, `"serif"` names an actual font family, while `serif` selects the generic serif family.

Static names in a `font-family` list are checked even when the list also contains a dynamic value such as `var(--fonts)`. A `font` shorthand that cannot be matched against the CSS grammar, usually because it contains a custom property substitution, is ignored.

The autofix removes the duplicate name and its preceding comma. A duplicate is still reported without a fix when removing it could remove or relocate a comment.

## Examples

```css
/* ❌ */
.heading {
	font-family: Inter, "inter", sans-serif;
}

/* ✅ */
.heading {
	font-family: Inter, sans-serif;
}
```

```css
/* ❌ */
.article {
	font: italic 1rem Times New Roman, "Times New Roman", serif;
}

/* ✅ */
.article {
	font: italic 1rem Times New Roman, serif;
}
```

```css
/* ✅ */
.example {
	font-family: "serif", serif;
}
```

Some legacy stylesheets intentionally repeat `monospace` to work around font sizing in obsolete browser versions. Use an ESLint disable comment when preserving that behavior is required.

```css
pre {
	/* eslint-disable-next-line unicorn/no-duplicate-font-family-names -- Legacy browser workaround. */
	font-family: monospace, monospace;
}
```

## CSS files

Enable it for CSS files with [`@eslint/css`](https://github.com/eslint/css):

```js
import css from '@eslint/css';
import {defineConfig} from 'eslint/config';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
	{
		files: ['**/*.css'],
		plugins: {
			css,
			unicorn,
		},
		language: 'css/css',
		extends: [
			'unicorn/css/unopinionated',
		],
	},
]);
```
