# Prefer `node.remove()` over `parentNode.removeChild(node)` and `parentElement.removeChild(node)`

Enforces the use of, for example, `child.remove();` over `child.parentNode.removeChild(child);` and `child.parentElement.removeChild(child);` for DOM nodes. The DOM function [`Node#remove()`](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove) is preferred over the indirect removal of an object with [`Node#removeChild()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/removeChild).

This rule is fixable.


## Fail

```js
foo.parentNode.removeChild(foo);
foo.parentElement.removeChild(foo);
this.parentNode.removeChild(this);
this.parentElement.removeChild(this);
foo.parentNode.removeChild(bar);
foo.parentElement.removeChild(bar);
this.parentNode.removeChild(foo);
this.parentElement.removeChild(foo);
```


## Pass

```js
foo.remove();
this.remove();
```
