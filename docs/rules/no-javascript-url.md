# no-javascript-url

📝 Disallow `javascript:` URLs in Markdown.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow `javascript:` destinations in Markdown links, images, autolinks, and reference definitions. A link with this scheme can execute JavaScript when followed in a browser, depending on the renderer. The rule checks parsed destinations using browser URL parsing, including mixed-case schemes and character references that the Markdown parser decodes.

Reference definitions are reported at the definition, including unused definitions. Raw HTML in Markdown is not checked.

## Examples

```md
<!-- ❌ -->
[Open](javascript:alert(1))
![Image](JaVaScRiPt:alert(1))
<javascript:alert(1)>

[Open][destination]

[destination]: javascript:alert(1)

<!-- ✅ -->
[Open](https://example.com)
![Image](https://example.com/image.png)
<https://example.com>
```

## Usage

Enable the rule for Markdown files with [`@eslint/markdown`](https://github.com/eslint/markdown):

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
		rules: {
			'unicorn/no-javascript-url': 'error',
		},
	},
]);
```

Use `markdown/commonmark` instead of `markdown/gfm` for CommonMark files.
