# Prefer `remove` over `removeChild`

Enforces the use of, for example, `node.remove();` over `node.parentNode.removeChild(node);` for DOM nodes.

This rule is fixable.


## Fail

```js
foo.parentNode.removeChild(foo);
this.parentNode.removeChild(this);
```

## Pass

```js
foo.remove();
this.remove();
```
