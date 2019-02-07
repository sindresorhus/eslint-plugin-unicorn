# Prefer `textContent` over `innerText`

Enforces the use of `node.textContent` over `node.innerText` for DOM nodes. There are [some advantages of using `.textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent), like performance and more predictable behavior when updating it.

This rule is fixable.


## Fail

```js
foo.innerText = '🦄';
```

## Pass

```js
foo.textContent = '🦄';
```
