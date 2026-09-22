# relative-url-style

📝 Enforce consistent relative URL style.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use a consistent `./` prefix for relative URLs in [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL), CSS `url()`, `image-set()`, and `@import`, HTML URL attributes (`href`, `src`, `poster`, `srcset`, `imagesrcset`), and Markdown links, images, and definitions. The rule changes a prefix only when both forms resolve to the same URL.

In CSS at-rule preludes, only `@import` targets are checked. Fixes preserve `srcset` descriptors and separators; a prefix before a comma is retained to avoid changing candidate boundaries. Templated HTML/CSS URLs, entity-containing `srcset` values, complex Markdown labels, and escaped `./` prefixes are left unchanged.

## Examples

```js
// ❌
const url = new URL('./foo', base);

// ✅
const url = new URL('foo', base);
```

## Options

Type: `string`\
Default: `'never'`

- `'never'` (default)
  - Never use a `./` prefix.
- `'always'`
  - Always add a `./` prefix to the relative URL when possible.

```js
/* eslint unicorn/relative-url-style: ["error", "always"] */

// ❌
const url = new URL('foo', base);

// ✅
const url = new URL('./foo', base);
```
