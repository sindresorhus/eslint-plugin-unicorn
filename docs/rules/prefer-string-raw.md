# prefer-string-raw

📝 Prefer using the `String.raw` tag to avoid escaping `\`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`String.raw`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw) is a tagged template that allows you to use backslashes without escaping them. This is particularly useful for file paths, regex patterns, and other strings with many backslashes, making the code more readable and less error-prone.

Adding or removing `String.raw` from a template with two or more substitutions can change the order in which the substitutions are converted to strings.

In TypeScript, adding `String.raw` can widen a string literal type to `string`. The rule offers a suggestion unless the conversion is known to preserve the type. Strings directly under a const assertion are reported without a fix or suggestion, since adding a tag would invalidate the assertion. Type information, when available, allows more conversions to be automatically fixed.

## Examples

```js
// ❌
const file = "C:\\windows\\style\\path\\to\\file.js";

// ✅
const file = String.raw`C:\windows\style\path\to\file.js`;
```

```js
// ❌
const regexp = new RegExp('foo\\.bar');

// ✅
const regexp = new RegExp(String.raw`foo\.bar`);
```

```js
// ❌
const file = `C:\\windows\\temp\\myapp-${process.pid}.log`;

// ✅
const file = String.raw`C:\windows\temp\myapp-${process.pid}.log`;
```

[`String.raw`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw) should not be used if the string does not contain any `\`.

```js
// ❌
const noBackslash = String.raw`foobar`

// ✅
const noBackslash = 'foobar'
```
