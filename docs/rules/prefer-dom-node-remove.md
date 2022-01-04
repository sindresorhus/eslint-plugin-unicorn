# Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

Enforces the use of, for example, `child.remove();` over `child.parentNode.removeChild(child);`. The DOM function [`Node#remove()`](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove) is preferred over the indirect removal of an object with [`Node#removeChild()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/removeChild).

## Fail

```js
parentNode.removeChild(foo);
parentNode.removeChild(this);
```

## Pass

```js
foo.remove();
this.remove();
```
