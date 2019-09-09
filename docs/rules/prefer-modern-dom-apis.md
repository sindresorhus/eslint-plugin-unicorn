# Prefer modern DOM APIs

Enforces the use of:

- `childNode.replaceWith(newNode);` over `parentNode.replaceChild(newNode, oldNode)`;
- `referenceNode.before(newNode);` over `parentNode.insertBefore(newNode, referenceNode);`
- `referenceNode.before("text");` over `referenceNode.insertAdjacentText("beforebegin", "text");`
- `referenceNode.before(newNode);` over `referenceNode.insertAdjacentElement("beforebegin", newNode);`

There are some advantages of using the newer DOM APIs, like:

- traversing to the parent node is not necessary
- appending multiple nodes at once
- both [`DOMString`](https://developer.mozilla.org/en-US/docs/Web/API/DOMString) and [DOM node objects](https://developer.mozilla.org/en-US/docs/Web/API/Element) can be manipulated.

This rule is fixable.

## Fail

```js
foo.replaceChild(baz, bar);

foo.insertBefore(baz, bar);

foo.insertAdjacentText('position', bar);

foo.insertAdjacentElement('position', bar);
```

## Pass

```js
foo.replaceWith(bar);
foo.replaceWith('bar');
foo.replaceWith(bar, 'baz'));

foo.before(bar)
foo.before('bar')
foo.before(bar, 'baz')

foo.prepend(bar)
foo.prepend('bar')
foo.prepend(bar, 'baz')

foo.append(bar)
foo.append('bar')
foo.append(bar, 'baz')

foo.after(bar)
foo.after('bar')
foo.after(bar, 'baz')
```
