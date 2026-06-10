# no-empty-file

📝 Disallow empty files.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Meaningless files clutter a codebase.

This applies to files of any extension. It is tested with JavaScript, TypeScript, Vue ([`vue-eslint-parser`](https://github.com/vuejs/vue-eslint-parser)), HTML ([`@html-eslint/parser`](https://github.com/yeonjuan/html-eslint)), CSS ([`@eslint/css`](https://github.com/eslint/css)), and Markdown ([`@eslint/markdown`](https://github.com/eslint/markdown)). An empty JSON file is already a syntax error, so it does not need this rule.

Code extracted by a processor (for example, fenced code blocks in Markdown) is not treated as a file, so an empty extracted block is not reported.

Disallow any files only containing the following:

- Whitespace
- Comments
- Directives
- Empty statements
- Empty block statements
- Hashbang

## Examples

These files fail:

```js

```

```js
// Comment
```

```js
/* Comment */
```

```js
'use strict';
```

```js
;
```

```js
{
}
```

```js
#!/usr/bin/env node
```

These files pass:

```js
const x = 0;
```

```js
'use strict';
const x = 0;
```

```js
;;
const x = 0;
```

```js
{
	const x = 0;
}
```

## Options

### allowComments

Type: `boolean`\
Default: `false`

Allow files that only contain comments:

```js
'unicorn/no-empty-file': [
	'error',
	{
		allowComments: true,
	},
]
```

This only allows normal line and block comments. Files with only a hashbang, directives, empty statements, or empty block statements are still reported.
