# no-asterisk-prefix-in-documentation-comments

📝 Disallow asterisk prefixes and shared indentation in multiline comments.

💼🚫 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🧩 `recommended-json`, 💎 `recommended-soml`. This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule disallows conventional indented asterisk prefixes and shared extra indentation inside multiline comments. It checks comments with only spaces or tabs before the opening delimiter on its line. In JavaScript and TypeScript, it applies only to documentation comments. In CSS, JSONC, JSON5, and SOML, it applies to block comments.

The autofix removes prefixes and shared extra indentation after the opening line, preserving relative indentation. Put all content after the opening line when Markdown indentation matters. An asterisk at the same indentation as the opening delimiter may be intentional content. The rule skips comments that mix prefixed and unprefixed nonblank continuation lines or use different indentation for their prefixes.

When the autofix removes asterisk prefixes, it aligns a standalone closing delimiter with the opening delimiter. It also separates text from the delimiters if there are spaces or tabs between them. A delimiter that touches the text stays on the same line. In JavaScript and TypeScript, the rule skips comments that mention `@ts-ignore` or `@ts-expect-error` on the last line to preserve TypeScript's handling of these directives.

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
