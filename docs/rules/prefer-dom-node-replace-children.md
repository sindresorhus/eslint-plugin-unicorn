# prefer-dom-node-replace-children

📝 Prefer `.replaceChildren()` when emptying DOM children.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`.replaceChildren()`](https://dom.spec.whatwg.org/#dom-parentnode-replacechildren) is the direct way to remove all child nodes from a DOM parent node.

This rule reports empty `.innerHTML` assignments and simple loops that repeatedly remove `.firstChild` or `.lastChild` through `.removeChild()`.

It ignores empty `.innerHTML` assignments on HTML template elements because `template.innerHTML = ''` clears template content, while `template.replaceChildren()` clears direct children.

The rule is intentionally focused on emptying children. Non-empty `.innerHTML` assignments are handled by [`prefer-dom-node-html-methods`](./prefer-dom-node-html-methods.md) and [`no-unsafe-dom-html`](./no-unsafe-dom-html.md), depending on whether the goal is modernization or security.

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
