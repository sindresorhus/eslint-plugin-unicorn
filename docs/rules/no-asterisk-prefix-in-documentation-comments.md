# no-asterisk-prefix-in-documentation-comments

📝 Disallow asterisk prefixes and shared indentation in multiline comments.

💼🚫 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🧩 `recommended-json`, 💎 `recommended-soml`. This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks multiline comments with only spaces or tabs before the opening delimiter on its line. It applies to JSDoc comments in JavaScript and TypeScript and block comments in CSS, JSONC, JSON5, and SOML.

The autofix removes asterisk prefixes and shared indentation while preserving relative indentation. When removing prefixes, it aligns standalone closing delimiters and moves delimiters onto their own lines when separated from text by spaces or tabs. Opening text that starts with `*` stays in place. Start the content on the next line when Markdown indentation matters.

The rule treats an asterisk aligned with the opening delimiter as text. It skips comments that mix prefixed and unprefixed nonblank continuation lines or indent prefixes unevenly. It also skips JSDoc comments whose last line mentions `@ts-ignore` or `@ts-expect-error`.

## Examples

```js
// ❌
/**
 * Add two numbers.
 * @param {number} number1 The first number.
 * @param {number} number2 The second number.
 * @returns {number} The sum of the two numbers.
 */
```

```js
// ✅
/**
Add two numbers.
@param {number} number1 The first number.
@param {number} number2 The second number.
@returns {number} The sum of the two numbers.
*/
```

Comments without asterisk prefixes are also checked:

```js
// ❌
/**
 Description.
   Indented example.
 */

// ✅
/**
Description.
  Indented example.
*/
```

The rule also supports CSS, JSONC, JSON5, and SOML comments:

```css
/* ❌ */
/* Description.
 * More details. */

/* ✅ */
/*
Description.
More details.
*/
```
