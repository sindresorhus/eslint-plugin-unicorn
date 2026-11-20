# prefer-named-character-references

📝 Prefer named character references over numeric references.

🚫 Disabled by default.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer named references for decimal and hexadecimal character references. The rule checks text and attribute values in JSX, HTML, Vue, and Svelte. It checks prose and the destinations and titles of links and images in CommonMark and GitHub Flavored Markdown. In HTML, Vue, and Svelte markup, it also checks numeric references without a trailing semicolon. In JSX, Markdown, and ordinary strings, the rule requires a trailing semicolon.

JSX uses the HTML4 name table. `&#x2060;` passes in JSX because that table has no name for it. For parser compatibility, the rule skips numeric references with more than eight decimal digits or seven hexadecimal digits. [JSX specification](https://react.github.io/jsx/#sec-HTMLCharacterReference)

HTML, Markdown, Vue, and Svelte use the HTML5 name table, where `&#x2060;` can become `&NoBreak;`. [HTML character references](https://html.spec.whatwg.org/multipage/named-characters.html)

The rule also scans string values in JavaScript, TypeScript, CSS, JSON, JSONC, JSON5, SOML, TOML, and YAML for references written directly in the source. This includes JavaScript template literals and strings inside JSX expressions. It uses the HTML5 name table even when a string contains no surrounding markup. Replacing a reference changes the string value, so these replacements are editor suggestions and require you to apply them.

In HTML, the rule skips configured frontmatter, raw text such as script contents, and CDATA. It also skips text when HTML error recovery merges text across intervening markup. It skips a document when custom raw-text tags are configured or when the HTML contains `{{`, `{%`, `<%`, `${`, or a configured template opener.

The rule parses HTML files as documents. In a fragment such as a `<tr>` without a surrounding `<table>`, the parser can discard the tag and its attributes.

The rule skips HTML files with bare carriage returns, Unicode line separators, or Unicode paragraph separators. ESLint’s offset lookup can disagree with the HTML parser about line numbers in these files.

In Vue templates parsed by `vue-eslint-parser`, the rule autofixes text. It offers editor suggestions for static attribute values because Vue 2 and Vue 3 decode different sets of references. It skips directive expressions and interpolations, raw text, and templates when a custom tokenizer is configured.

In Svelte templates parsed by `svelte-eslint-parser`, the rule autofixes template text and literal parts of attribute values when the parser decodes them using HTML semantics. The template autofix skips raw-text content and directives.

In Markdown, the rule autofixes destinations and titles in inline links, inline images, and reference definitions when it can locate them in the source. It skips code, math, raw HTML nodes, autolinks, image descriptions, and images with ambiguous destination boundaries. It also skips prose next to GitHub Flavored Markdown autolinks when the parser drops the source positions after decoding references or escapes.

When a Markdown document may contain reference definitions, the rule skips text in paragraphs, headings, and table cells with opening brackets. A different spelling can change which definition a label matches.

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
Copyright &#169; <span title="&#169;">A&#160;B</span>

<!-- ✅ -->
Copyright &copy; <span title="&#169;">A&nbsp;B</span>
```

```md
<!-- ❌ -->
[Guide](/a&#x2060;b "Copyright &#169;")

<!-- ✅ -->
[Guide](/a&NoBreak;b "Copyright &copy;")
```

```js
// ❌
const html = '&#x2060;';

// ✅
const html = '&NoBreak;';
```
