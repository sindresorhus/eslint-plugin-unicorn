# prefer-named-character-references

📝 Prefer named character references over numeric references.

💼🚫 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🌐 `recommended-html`, 🧩 `recommended-json`, 📚 `recommended-markdown`, 💎 `recommended-soml`, 🛠️ `recommended-toml`, 📋 `recommended-yaml`. This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The rule uses [HTML5 names](https://html.spec.whatwg.org/multipage/named-characters.html). In JSX text and quoted attributes, it uses [HTML4 names](https://react.github.io/jsx/#sec-HTMLCharacterReference) and checks up to eight decimal or seven hexadecimal digits. It requires a trailing semicolon except in HTML, Vue templates, and Svelte attributes.

## Supported contexts

- **JSX and HTML** get autofixes in text and literal attributes. In HTML, the rule skips configured frontmatter, raw text, and CDATA. It skips files with template openers in markup, custom raw-text tags, bare carriage returns, or Unicode line or paragraph separators.
- **Vue** gets autofixes in template text and suggestions in static attributes with `vue-eslint-parser`. **Svelte** gets autofixes in template text and literal attribute parts with `svelte-eslint-parser`.
- **CommonMark and GitHub Flavored Markdown** get autofixes in prose and in the destinations and titles of links, images, and reference definitions. The rule preserves reference labels and skips code, math, raw HTML, autolinks, image descriptions, and ambiguous ranges.

## Options

### `checkStrings`

Type: `boolean`\
Default: `false`

Whether to suggest replacements in JavaScript and TypeScript strings and runtime template literals, including JSX expressions. Enable this option to check CSS, JSON, JSONC, JSON5, SOML, TOML, and YAML, where the rule only checks strings. It skips YAML keys.

## Examples

```jsx
// ❌
<span title="Copyright &#169;">A&#xA0;B</span>;

// ✅
<span title="Copyright &copy;">A&nbsp;B</span>;
```

With `checkStrings: true`:

```js
// ❌
const html = '&#x2060;';

// ✅
const html = '&NoBreak;';
```

## Related rules

- Use [`no-magic-escape-sequences`](no-magic-escape-sequences.md) to extract numeric escapes into named constants.
