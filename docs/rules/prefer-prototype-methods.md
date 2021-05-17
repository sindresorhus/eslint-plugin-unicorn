# Prefer borrowing methods from the prototype instead of methods from an instance.

When “borrowing” a method from a different object (especially generic methods from `Array`), it‘s clearer to get it from the prototype than from an instance.

This rule is fixable when using method from `[]` or `{}`.

## Fail

```js
const array = [].slice.apply(bar);
```

```js
const hasProperty = {}.hasOwnProperty.call(foo, 'property');
```

```js
foo.bar.call(baz);
```

```js
Reflect.apply([].forEach, arrayLike, [callback]);
```

## Pass

```js
const array = Array.prototype.slice.apply(bar);
```

```js
const hasProperty = Object.prototype.hasOwnProperty.call(foo, 'property');
```

```js
Foo.prototype.bar.call(baz);
```

```js
foo.constructor.prototype.bar.call(baz);
```

```js
Reflect.apply(Array.prototype.forEach, arrayLike, [callback]);
```

```js
const maxValue = Math.max.apply(Math, numbers);
```
