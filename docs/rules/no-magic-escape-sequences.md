# no-magic-escape-sequences

📝 Require names for numeric escape sequences in strings.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports `\xHH`, `\uHHHH`, and `\u{…}` in strings and untagged templates, including JSX and Vue expressions. Adjacent numeric escapes share one report. Short escapes such as `\n`, `\t`, and `\0` are allowed, as are named `const` initializers made entirely of escapes, even with TypeScript assertions.

The rule skips tagged template text, regex literals, JSX text and quoted attributes, and Vue segments with decoded HTML references. It also skips TypeScript declaration files and ambient declarations, literal-only syntax, and paths in `import()`, direct `require()`, and `new URL(path, import.meta.url)`. Runtime import options are checked.

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
