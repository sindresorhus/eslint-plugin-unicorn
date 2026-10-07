# relative-url-style

📝 Enforce consistent relative URL style.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🌐 `recommended-html`, 📚 `recommended-markdown`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce whether relative URLs use a `./` prefix in:

- JavaScript: `new URL()`, `URL.canParse()`, and `URL.parse()` with two arguments.
- CSS: `url()`, `image-set()`, and `@import` targets.
- HTML and native JSX/TSX elements: `href`, `src`, `poster`, `srcset`, `imagesrcset`, `action`, `formaction`, and `cite` attributes. JSX uses `srcSet`, `imageSrcSet`, and `formAction`.
- Markdown: Links, images, reference definitions, and embedded HTML.

Autofixes preserve URL resolution. Under `'never'`, JavaScript templates with substitutions and a literal `./` prefix receive an editor suggestion, which can change URL resolution.

JavaScript supports string literals and templates without substitutions, including type assertions and non-null assertions, but skips `satisfies`. JSX supports quoted attributes and direct strings or templates without substitutions inside braces, except for `srcSet` and `imageSrcSet` expressions. Custom components and other expressions are skipped.

Markdown image descriptions can contain formatting. URLs inside descriptions are left unchanged.

The rule skips ambiguous syntax:

- Escaped `./` prefixes, templated HTML/CSS URLs, and JSX strings whose entity decoding differs from HTML.
- `srcset` values containing entities and candidates starting with `./,`.
- Markdown URLs containing `<`, complex reference-definition labels, and multiline destinations containing blockquote markers.
- Markdown images containing footnote syntax, math delimiters with math enabled, or syntax requiring surrounding Markdown to parse.
- Embedded HTML when Markdown container processing changes an HTML fragment's source.

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
<img src={'./image.png'} />;

// ✅
<img src={'image.png'} />;
```

## Options

Type: `string`\
Default: `'never'`

- `'never'` (default): Remove a `./` prefix when URL resolution is unchanged.
- `'always'`: Add a `./` prefix when URL resolution is unchanged.

The `'always'` style includes hidden paths such as `.env` and `.well-known/security.txt`, but leaves current-directory and parent-directory references unchanged.

```js
/* eslint unicorn/relative-url-style: ["error", "always"] */

// ❌
const url = new URL('foo', base);

// ✅
const url = new URL('./foo', base);
```
