# Prefer `remove` over `parentNode.removeChild`

Enforces the use of, for example, `child.remove();` over `child.parentNode.removeChild(child);` for DOM nodes. The DOM function [`.remove()`](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove) is preferred over the indirect removal of an object with [`.removeChild()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/removeChild).

This rule is fixable.


## Fail

```js
foo.parentNode.removeChild(foo);
this.parentNode.removeChild(this);
foo.parentNode.removeChild(bar);
this.parentNode.removeChild(foo);
```

## Pass

```js
foo.remove();
this.remove();
```
