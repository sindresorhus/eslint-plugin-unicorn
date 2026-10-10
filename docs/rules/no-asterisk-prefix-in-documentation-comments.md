# no-asterisk-prefix-in-documentation-comments

📝 Disallow asterisk prefixes and shared indentation in multiline comments.

💼🚫 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🧩 `recommended-json`, 💎 `recommended-soml`. This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule disallows conventional indented asterisk prefixes and shared extra indentation inside multiline comments. In JavaScript, it only applies to documentation comments; regular block comments are ignored. In CSS, JSONC, JSON5, and SOML, it applies to all block comments. The autofix removes prefixes and shared extra indentation after the opening line, preserving relative indentation and aligning the closing delimiter. Put all content after the opening line when Markdown indentation matters. No-gap asterisk lines like `* content` are ignored because the asterisk may be intentional comment content.

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
/*
 * Description.
 */

/* ✅ */
/*
Description.
*/
```
