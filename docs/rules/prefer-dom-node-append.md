# prefer-dom-node-append

📝 Prefer `Element#append()` over `Node#appendChild()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of, for example, `document.body.append(div);` over `document.body.appendChild(div);` for DOM nodes. There are [some advantages of using `Element#append()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/append), like the ability to append multiple nodes and to append both [`DOMString`](https://developer.mozilla.org/en-US/docs/Web/API/DOMString) and DOM node objects.

`appendChild()` is available on `Node`, but `append()` is not available on every `Node`. This rule still reports `appendChild()` because using it on nodes that cannot accept children can fail at runtime. Autofix is only provided when the return value of `appendChild()` is unused, since `appendChild()` returns the appended node and `append()` returns `undefined`.

## Examples

```js
// ❌
foo.appendChild(bar);

// ✅
foo.append(bar);
```
