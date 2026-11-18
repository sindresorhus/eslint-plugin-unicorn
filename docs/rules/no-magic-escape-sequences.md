# no-magic-escape-sequences

📝 Require names for numeric escape sequences in strings and JSX.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports `\xHH`, `\uHHHH`, and `\u{…}` in strings and untagged templates, including JSX and Vue expressions. Adjacent numeric escapes in strings share one report. Short escapes such as `\n`, `\t`, and `\0` are allowed, as are named `const` initializers made entirely of escapes, even with TypeScript assertions.

In JSX text and quoted attributes, the rule reports numeric character references such as `&#160;` and `&#xA0;`. To extract a reference, use a JavaScript escape for the decoded character in the constant. Named references such as `&nbsp;` are allowed. The rule also allows numeric references for `<`, `>`, `{`, and `}` in JSX text and for the quote that delimits an attribute value.

The rule checks references that end in a semicolon and contain up to eight decimal digits or a lowercase `x` followed by up to seven hexadecimal digits. JSX parsers can interpret longer references differently.

The rule skips tagged template text, regex literals, Vue segments with decoded HTML references, ambient TypeScript code, and literal-only syntax. Paths in `import()`, direct `require()`, and `new URL(path, import.meta.url)` are exempt. The rule checks runtime import options.

The rule uses syntax only. It can report a numeric escape in a TypeScript `const enum` index that must stay literal.

## Examples

```js
// ❌
const message = 'Click \u{2B24} to continue';

// ✅
const largeCircle = '\u{2B24}';
const message = `Click ${largeCircle} to continue`;
```

```jsx
// ❌
<span>{'\u{2B24}'}</span>;

// ✅
const largeCircle = '\u{2B24}';
<span>{largeCircle}</span>;
```

When a reference is part of a text child, put the whole string in one JSX expression so the component receives one string child.

```jsx
// ❌
<Label>Page&#xA0;1</Label>;

// ✅
const nonBreakingSpace = '\u00A0';
<Label>{`Page${nonBreakingSpace}1`}</Label>;
```
