# prefer-regexp-escape

📝 Prefer `RegExp.escape()` for escaping strings to use in regular expressions.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`RegExp.escape()` escapes a string so it can be safely used as a literal pattern in the `RegExp` constructor.

This rule targets common hand-rolled escaping snippets, including reordered character classes and variants that miss some special characters. It also reports calls to popular escape helpers like `escape-string-regexp`, `lodash.escaperegexp`, and Lodash's `escapeRegExp`.

`RegExp.escape()` handles cases many of these snippets and packages miss, such as leading ASCII letters or digits and punctuators that cannot always be escaped with a leading backslash.

## Examples

```js
// ❌
const escaped = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ❌
const escaped = string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

// ❌
import escapeStringRegexp from 'escape-string-regexp';

const escaped = escapeStringRegexp(string);

// ❌
const escaped = _.escapeRegExp(string);

// ✅
const escaped = RegExp.escape(string);
```

```js
// ✅
const escaped = string.replace(/[.*+?^$]/g, '\\$&');

// ✅
const escaped = string.replace(/[.*+?^${}()|[\]\\]/gy, '\\$&');
```

The rule is off by default because `RegExp.escape()` is a modern runtime API.
