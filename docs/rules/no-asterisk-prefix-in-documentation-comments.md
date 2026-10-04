# no-asterisk-prefix-in-documentation-comments

📝 Disallow asterisk prefixes and shared indentation in multiline comments.

💼🚫 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🧩 `recommended-json`. This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule disallows conventional indented asterisk prefixes and shared extra indentation inside multiline comments. In JavaScript, it only applies to documentation comments; regular block comments are ignored. In CSS, JSONC, and JSON5, it applies to all block comments. The autofix removes asterisk prefixes and aligns the comment content and closing delimiter with the opening delimiter. It removes only the shared extra indentation of nonblank content lines after the opening line, preserving relative indentation between those lines for lists and code examples. The opening line is kept unchanged and excluded when calculating shared indentation. When Markdown indentation matters, place all content on separate lines after the opening delimiter. No-gap asterisk lines like `* content` are ignored because the asterisk may be intentional comment content.

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
