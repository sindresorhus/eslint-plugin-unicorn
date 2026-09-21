# no-asterisk-prefix-in-documentation-comments

📝 Disallow asterisk prefixes in multiline comments.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule disallows the conventional indented asterisk prefix inside multiline comments. In JavaScript, it only applies to documentation comments; regular block comments are ignored. In CSS, JSONC, and JSON5, it applies to all block comments. The autofix also removes the extra space before the comment content and closing delimiter. No-gap asterisk lines like `* content` are ignored because the asterisk may be intentional comment content.

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

The rule also supports CSS, JSONC, and JSON5 comments:

```css
/* ❌ */
/*
 * Description.
 */

/* ✅ */
/*
Description.
*/
```
