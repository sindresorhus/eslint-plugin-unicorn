# prefer-named-character-references

📝 Prefer named character references in JSX, HTML, and Markdown.

🚫 Disabled by default.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer named references for decimal and hexadecimal character references that end with a semicolon. The rule checks JSX text and quoted JSX attributes, HTML text and attribute values, and Markdown prose in CommonMark and GitHub Flavored Markdown.

JSX uses the HTML4 name table. It accepts `&#x2060;` and skips numeric references with more than eight decimal digits or seven hexadecimal digits for parser compatibility. [JSX specification](https://react.github.io/jsx/#sec-HTMLCharacterReference)

HTML and Markdown use the HTML5 name table, where `&#x2060;` can become `&NoBreak;`. [HTML character references](https://html.spec.whatwg.org/multipage/named-characters.html)

In HTML, the rule skips configured frontmatter, raw text such as script contents, and CDATA. It also skips text when HTML error recovery merges text across intervening markup. It skips a document when custom raw-text tags are configured or when the HTML contains `{{`, `{%`, `<%`, `${`, or a configured template opener.

In Markdown, it skips code, math, raw HTML nodes, autolinks, link destinations and titles, and image alt text. It also skips prose next to GitHub Flavored Markdown autolinks when the parser drops the source positions after decoding references or escapes.

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
