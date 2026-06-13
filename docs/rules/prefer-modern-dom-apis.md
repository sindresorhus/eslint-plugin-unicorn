# prefer-modern-dom-apis

📝 Prefer modern DOM APIs.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `.before()` over `.insertBefore()`, `.replaceWith()` over `.replaceChild()`, one of `.before()`, `.after()`, `.append()` or `.prepend()` over `insertAdjacentText()` and `insertAdjacentElement()`, and `.replaceChildren()` over direct `.firstChild.remove()`/`.lastChild.remove()` loops.

Enforces the use of:

- [childNode.replaceWith(newNode)](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/replaceWith) over [parentNode.replaceChild(newNode, oldNode)](https://developer.mozilla.org/en-US/docs/Web/API/Node/replaceChild)
- [referenceNode.before(newNode)](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/before) over [parentNode.insertBefore(newNode, referenceNode)](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore)
- [referenceNode.before('text')](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/before) over [referenceNode.insertAdjacentText('beforebegin', 'text')](https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentText)
- [referenceNode.before(newNode)](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/before) over [referenceNode.insertAdjacentElement('beforebegin', newNode)](https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentElement)
- [node.replaceChildren()](https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren) over loops that directly remove the same checked `node.firstChild` or `node.lastChild`

There are some advantages of using the newer DOM APIs, like:

- Traversing to the parent node is not necessary.
- Appending multiple nodes at once.
- Removing all child nodes without manual iteration.
- Both [`DOMString`](https://developer.mozilla.org/en-US/docs/Web/API/DOMString) and [DOM node objects](https://developer.mozilla.org/en-US/docs/Web/API/Element) can be manipulated.

The autofix assumes the code does not depend on per-child [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) records from repeated removals.

## Examples

```js
// ❌
parentNode.replaceChild(newNode, oldNode);

// ✅
oldNode.replaceWith(newNode);
```

```js
// ❌
parentNode.insertBefore(newNode, oldNode);

// ✅
oldNode.before(newNode);
```

```js
// ❌
referenceNode.insertAdjacentText('beforebegin', 'text');

// ✅
referenceNode.before('text');
```

```js
// ❌
referenceNode.insertAdjacentText('afterbegin', 'text');

// ✅
referenceNode.prepend('text');
```

```js
// ❌
referenceNode.insertAdjacentText('beforeend', 'text');

// ✅
referenceNode.append('text');
```

```js
// ❌
referenceNode.insertAdjacentText('afterend', 'text');

// ✅
referenceNode.after('text');
```

```js
// ❌
referenceNode.insertAdjacentElement('beforebegin', newNode);

// ✅
referenceNode.before(newNode);
```

```js
// ❌
referenceNode.insertAdjacentElement('afterbegin', newNode);

// ✅
referenceNode.prepend(newNode);
```

```js
// ❌
referenceNode.insertAdjacentElement('beforeend', newNode);

// ✅
referenceNode.append(newNode);
```

```js
// ❌
referenceNode.insertAdjacentElement('afterend', newNode);

// ✅
referenceNode.after(newNode);
```

```js
// ❌
while (node.firstChild) {
	node.firstChild.remove();
}

// ✅
node.replaceChildren();
```
