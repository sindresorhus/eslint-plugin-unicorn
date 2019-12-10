# Prefer `Reflect.apply()` over `Function#apply()`

[`Reflect.apply()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) is arguably less verbose and easier to understand. In addition, when you accept arbitrary methods, it's not safe to assume `.apply()` exists or is not overridden.

This rule is fixable.


## Fail

```js
function foo() {}

foo.apply(null, [42]);
Function.prototype.apply.call(foo, null, [42]);
foo.apply(this, [42]);
Function.prototype.apply.call(foo, this, [42]);
foo.apply(null, arguments);
Function.prototype.apply.call(foo, null, arguments);
foo.apply(this, arguments);
Function.prototype.apply.call(foo, this, arguments);
```


## Pass

```js
function foo() {}

Reflect.apply(foo, null, [42]);
```
