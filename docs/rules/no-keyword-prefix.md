# Disallow identifiers starting with `new` or `class`

`new Foo` and `newFoo` look very similar. Use alternatives that do not look like keyword usage.

## Fail

```js
const newFoo = 'foo';
const classFoo = 'foo';
```


## Pass

```js
const foo = 'foo';
const _newFoo = 'foo';
const new_foo = 'foo';
const fooNew = 'foo';
```
