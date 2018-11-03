# Prefer `append` over `appendChild`

Enforces the use of, for example, `document.window.append(div);` over `document.window.appendChild(div);` for HTML DOM Elements. There are [some advantages of using `addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/append). These advantages include the ability to append multiple nodes and to append both DOMString and Node Objects.

This rule is fixable.


## Fail

```js
foo.appendChild(bar);
```

## Pass

```js
foo.append(bar);
```

```js
foo.append('bar');
```

```js
foo.append(bar, 'baz');
```
