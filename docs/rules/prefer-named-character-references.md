# prefer-named-character-references

📝 Prefer named character references over numeric references.

🚫 Disabled by default.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The rule checks decimal and hexadecimal references. In JSX, it uses [HTML4 names](https://react.github.io/jsx/#sec-HTMLCharacterReference) and checks up to eight decimal digits or seven hexadecimal digits. Elsewhere, it uses [HTML5 names](https://html.spec.whatwg.org/multipage/named-characters.html). It requires a trailing semicolon except in HTML, Vue templates, and Svelte attribute values.

## Supported contexts

- In **JSX**, the rule autofixes text and quoted attributes.
- In **HTML**, the rule autofixes text and attributes. It skips configured frontmatter, raw text, CDATA, and text merged across tags during error recovery. It skips files with custom raw-text tags, bare carriage returns, or Unicode line or paragraph separators. Template openers (`{{`, `{%`, `<%`, `${`, or configured delimiters) in the markup also cause it to skip the file. Document parsing can discard fragment tags such as a `<tr>` outside a table.
- With `vue-eslint-parser`, the rule autofixes **Vue** template text. Static attributes get suggestions because Vue 2 and Vue 3 decode different sets of references. The rule skips directives, interpolations, raw text, and templates with custom tokenizers.
- In **Svelte**, the rule autofixes template text and literal attribute parts when `svelte-eslint-parser` decodes them as HTML. These autofixes skip raw text and directives.
- In **CommonMark and GitHub Flavored Markdown**, the rule autofixes prose and the destinations and titles of links, images, and reference definitions. It skips code, math, raw HTML, autolinks, image descriptions, and ranges it cannot locate reliably. When reference definitions may be present, it skips prose in paragraphs, headings, and table cells with opening brackets to preserve label matching.
- In **JavaScript, TypeScript, CSS, JSON, JSONC, JSON5, SOML, TOML, and YAML string values**, the rule suggests changes to references written directly in source. This includes runtime templates and strings inside JSX expressions. It skips YAML mapping keys, including collections used as keys.

## Examples

```jsx
// ❌
<span title="Copyright &#169;">A&#xA0;B</span>;

// ✅
<span title="Copyright &copy;">A&nbsp;B</span>;
```

```html
<!-- ❌ -->
<p>A&#x2060;B</p>

<!-- ✅ -->
<p>A&NoBreak;B</p>
```

```md
<!-- ❌ -->
Copyright &#169;. [Guide](/a&#x2060;b "Read more")

<!-- ✅ -->
Copyright &copy;. [Guide](/a&NoBreak;b "Read more")
```

```js
// ❌
const html = '&#x2060;';

// ✅
const html = '&NoBreak;';
```

## Related rules

- Use [`no-magic-escape-sequences`](no-magic-escape-sequences.md) to extract numeric escapes into named constants.
