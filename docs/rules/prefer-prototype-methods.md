# Prefer borrowing methods from the prototype instead of methods from an instance

When “borrowing” a method from `Array` or `Object`, it‘s clearer to get it from the prototype than from an instance.

This rule is fixable.

## Fail

```js
const array = [].slice.apply(bar);
```

```js
const hasProperty = {}.hasOwnProperty.call(foo, 'property');
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
Reflect.apply(Array.prototype.forEach, arrayLike, [callback]);
```

```js
const maxValue = Math.max.apply(Math, numbers);
```
