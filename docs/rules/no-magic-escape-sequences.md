# no-magic-escape-sequences

📝 Require names for numeric escape sequences in strings and JSX.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports `\xHH`, `\uHHHH`, and `\u{…}` in strings and untagged templates, including JSX and Vue expressions. Adjacent numeric escapes in strings share one report. Short escapes such as `\n`, `\t`, and `\0` are allowed, as are named `const` initializers made entirely of escapes, even with TypeScript assertions.

In JSX text and quoted attributes, reports `&#…;` (up to eight decimal digits) and `&#x…;` (up to seven hex digits). Allows named references and numeric escapes for `<`, `>`, `{`, and `}` in text or the enclosing quote in an attribute.

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

Extract the decoded character to a named constant. Preserve the compiled string, including whitespace, and use one expression for the whole text child.

```jsx
// ❌
<Label>
	Page&#xA0;1
	of 3
</Label>;

// ✅
const nonBreakingSpace = '\u00A0';
<Label>{`Page${nonBreakingSpace}1 of 3`}</Label>;
```

## Related rules

- [`prefer-named-character-references`](prefer-named-character-references.md) replaces a numeric JSX reference with an equivalent named reference when JSX defines one. For example, it replaces `&#xA0;` with `&nbsp;`.
