# prefer-dom-node-html-methods

📝 Prefer `.getHTML()` and `.setHTML()` over `.innerHTML`.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Element#getHTML()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getHTML) and [`Element#setHTML()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setHTML) are safer and more modern alternatives to `.innerHTML`. Crucially, `setHTML()` automatically sanitizes the HTML to remove dangerous scripts before inserting it, while `.innerHTML` does not.

This rule is opt-in until Safari supports `setHTML()`, at which point it can become recommended.

## Examples

```js
// ❌ - No sanitization, vulnerable to XSS
const html = element.innerHTML;

// ✅ - No sanitization needed on read, but clearer API
const html = element.getHTML();
```

```js
// ❌ - Dangerous! XSS vulnerability if html contains untrusted content
element.innerHTML = userProvidedHTML;

// ✅ - Automatically sanitizes malicious scripts
element.setHTML(userProvidedHTML);
```

```js
// ✅ - Before setHTML(), you had to manually sanitize
// This was error-prone:
element.innerHTML = sanitizeHTML(userInput); // Easy to forget sanitization

// Now it's built in:
element.setHTML(userInput); // Automatic sanitization
```

```js
// ✅ - Use trusted HTML when you know it's safe
element.setHTML('<strong>Safe static HTML</strong>');
```
