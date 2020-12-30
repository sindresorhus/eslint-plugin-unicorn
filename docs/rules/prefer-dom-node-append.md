# Prefer `Node#append()` over `Node#appendChild()`

Enforces the use of, for example, `document.body.append(div);` over `document.body.appendChild(div);` for DOM nodes. There are [some advantages of using `Node#append()`](https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/append), like the ability to append multiple nodes and to append both [`DOMString`](https://developer.mozilla.org/en-US/docs/Web/API/DOMString) and DOM node objects.

This rule is fixable.


## Fail

```js
foo.appendChild(bar);
```


## Pass

```js
foo.append(bar);
foo.append('bar');
foo.append(bar, 'baz');
```
