# prefer-dom-node-replace-children

📝 Prefer `.replaceChildren()` when emptying DOM children.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use [`.replaceChildren()`](https://dom.spec.whatwg.org/#dom-parentnode-replacechildren) to empty DOM parent nodes. It is a direct DOM operation: remove the current children and insert no replacements.

`.innerHTML = ''` has the same visible result in many cases, but it uses an HTML string API for a tree operation. That is less clear, goes through HTML parsing semantics, and normalizes code around an injection sink when no HTML is needed.

This rule reports empty `.innerHTML` assignments and simple `.removeChild()` loops.

It ignores HTML template elements because `template.innerHTML = ''` clears template content, while `template.replaceChildren()` clears direct children.

Non-empty `.innerHTML` assignments are handled by [`prefer-dom-node-html-methods`](./prefer-dom-node-html-methods.md) and [`no-unsafe-dom-html`](./no-unsafe-dom-html.md).

## Examples

```js
// ❌
element.innerHTML = '';

// ✅
element.replaceChildren();
```

```js
// ❌
while (element.firstChild) {
	element.removeChild(element.firstChild);
}

// ✅
element.replaceChildren();
```

```js
// ❌
while (element.lastChild) {
	element.removeChild(element.lastChild);
}

// ✅
element.replaceChildren();
```
