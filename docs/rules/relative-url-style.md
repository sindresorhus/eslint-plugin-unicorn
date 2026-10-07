# relative-url-style

📝 Enforce consistent relative URL style.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🌐 `recommended-html`, 📚 `recommended-markdown`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use a consistent `./` prefix for relative URLs in [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL), CSS `url()`, `image-set()`, and `@import`, HTML URL attributes (`href`, `src`, `poster`, `srcset`, `imagesrcset`, `action`, `formaction`, `cite`), and Markdown links, images, and definitions, including HTML embedded in Markdown. The rule changes a prefix only when both forms resolve to the same URL.

`new URL()` supports string literals and template literals without substitutions, including TypeScript type assertions and non-null assertions. Expressions using `satisfies` are left unchanged.

Quoted URL attributes on native JSX/TSX elements are also checked, using the JSX names `srcSet`, `imageSrcSet`, and `formAction`. Custom components and dynamic attribute values are left unchanged.

In CSS at-rule preludes, only `@import` targets are checked. Fixes preserve `srcset` descriptors and separators; a prefix before a comma is retained to avoid changing candidate boundaries.

Markdown images support formatted descriptions; destinations inside those descriptions are left unchanged.

Some constructs are left unchanged:

- Escaped `./` prefixes, templated HTML/CSS URLs, entity-containing `srcset` values, and JSX strings whose entity decoding differs from HTML.
- Complex Markdown reference-definition labels.
- Markdown images that cannot be parsed independently, contain footnote-reference syntax (`[^`), or contain `$` with Markdown's `math` option enabled.
- Embedded HTML in documents where Markdown container processing changes any HTML fragment's source.

## Examples

```js
// ❌
const url = new URL('./foo', base);

// ✅
const url = new URL('foo', base);
```

```markdown
<!-- ❌ -->
- [`prefer-nesting`](./prefer-nesting.md)

<!-- ✅ -->
- [`prefer-nesting`](prefer-nesting.md)
```

```markdown
<!-- ❌ -->
![`API`](./diagram.png)
<img src="./diagram.png">

<!-- ✅ -->
![`API`](diagram.png)
<img src="diagram.png">
```

```jsx
// ❌
<form action="./submit"><button formAction="./preview">Preview</button></form>;

// ✅
<form action="submit"><button formAction="preview">Preview</button></form>;
```

## Options

Type: `string`\
Default: `'never'`

- `'never'` (default)
  - Never use a `./` prefix.
- `'always'`
  - Always add a `./` prefix to the relative URL when possible.

The `'always'` style also checks hidden paths such as `.env` and `.well-known/security.txt`, while leaving current-directory and parent-directory references unchanged.

```js
/* eslint unicorn/relative-url-style: ["error", "always"] */

// ❌
const url = new URL('foo', base);

// ✅
const url = new URL('./foo', base);
```
