# Prefer `Reflect.apply` over `Function.prototype.apply`

`Reflect.apply` is arguably less verbose and easier to understand. In addition, when you accept arbitrary methods, it's not safe to assume `.apply()` exists or is not overridden.


## Fail

```js
function foo() {}

foo.apply(null, [42]);
Function.prototype.apply.call(foo, null, [42]);
```


## Pass

```js
function foo() {}

Reflect.apply(foo, null, [42]);
```
