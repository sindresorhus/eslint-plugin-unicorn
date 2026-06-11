# prefer-dom-node-html-methods

📝 Prefer `.getHTML()` and `.setHTML()` over `.innerHTML`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `Element#getHTML()` and `Element#setHTML()` over direct `.innerHTML` access.

`setHTML()` sanitizes inserted HTML before replacing the element's contents, while assigning to `.innerHTML` does not.

## Examples

```js
// ❌
const html = element.innerHTML;

// ✅
const html = element.getHTML();
```

```js
// ❌
element.innerHTML = html;

// ✅
element.setHTML(html);
```
