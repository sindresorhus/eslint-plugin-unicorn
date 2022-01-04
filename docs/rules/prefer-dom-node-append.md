# Prefer `Node#append()` over `Node#appendChild()`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

Enforces the use of, for example, `document.body.append(div);` over `document.body.appendChild(div);` for DOM nodes. There are [some advantages of using `Node#append()`](https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/append), like the ability to append multiple nodes and to append both [`DOMString`](https://developer.mozilla.org/en-US/docs/Web/API/DOMString) and DOM node objects.

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
