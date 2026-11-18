# no-magic-escape-sequences

📝 Require names for numeric escape sequences in strings.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Numeric escape sequences such as `\u{2B24}` can be hard to identify in a string. A descriptive constant can explain what the character represents.

The rule checks `\xHH`, `\uHHHH`, and `\u{…}` in strings and untagged template literals, including in JSX and Vue template expressions. It reports adjacent numeric escapes together so a sequence such as `\uD83D\uDE00` can have one name. It allows a string made entirely of escapes as the initializer of a named `const`, including with TypeScript assertions such as `as const`. Short escapes such as `\n`, `\t`, and `\0` are allowed anywhere.

The rule skips text in tagged templates, regular expression literals, JSX text and quoted JSX attributes, and positions that require string literals. These positions include static module specifiers, literal-only import attributes, and TypeScript literal types. It also skips paths in `import()`, direct `require()` calls, and `new URL(path, import.meta.url)` because TypeScript and bundlers can rely on literal paths. Strings in runtime import options are still checked.

The rule skips TypeScript declaration files and ambient declarations marked with `declare`. It also skips Vue strings and template segments that contain decoded HTML character references.

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
