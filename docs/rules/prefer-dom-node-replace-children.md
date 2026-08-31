# prefer-dom-node-replace-children

📝 Prefer `.replaceChildren()` when replacing DOM children.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use [`.replaceChildren()`](https://dom.spec.whatwg.org/#dom-parentnode-replacechildren) to empty DOM parent nodes. It is a direct DOM operation: remove the current children and insert no replacements.

`.innerHTML = ''` has the same visible result in many cases, but it uses an HTML string API for a tree operation. That is less clear, goes through HTML parsing semantics, and normalizes code around an injection sink when no HTML is needed.

This rule reports empty `.innerHTML` assignments, simple `.removeChild()` loops, and an empty `.replaceChildren()` call immediately followed by `.append()` or `.prepend()` on the same node.

Combining the calls performs one DOM replacement instead of separate removal and insertion operations. Arguments whose evaluation or DOM string conversion cannot be proven safe are offered as a suggestion because `.replaceChildren()` evaluates and converts them before removing the existing children.

It ignores HTML template elements because `template.innerHTML = ''` clears template content, while `template.replaceChildren()` clears direct children.

Non-empty `.innerHTML` assignments are handled by [`prefer-dom-node-html-methods`](./prefer-dom-node-html-methods.md) and [`no-unsafe-dom-html`](./no-unsafe-dom-html.md).

Older insertion APIs are normalized by [`prefer-dom-node-append`](./prefer-dom-node-append.md) and [`prefer-modern-dom-apis`](./prefer-modern-dom-apis.md). Later ESLint passes can then report the resulting `.append()` or `.prepend()` combination, automatically fixing it only when its arguments are provably safe.

## Examples

```js
// ❌
element.innerHTML = '';

// ✅
element.replaceChildren();
```

```js
// ❌
element.replaceChildren();
element.append(child);

// ✅
element.replaceChildren(child);
```

```js
// ❌
element.replaceChildren();
element.prepend(firstChild, secondChild);

// ✅
element.replaceChildren(firstChild, secondChild);
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
