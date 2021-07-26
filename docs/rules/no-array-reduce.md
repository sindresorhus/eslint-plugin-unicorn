# Disallow `Array#reduce()` and `Array#reduceRight()`

`Array#reduce()` and `Array#reduceRight()` usually result in [hard-to-read](https://twitter.com/jaffathecake/status/1213077702300852224) and [less performant](https://www.richsnapp.com/article/2019/06-09-reduce-spread-anti-pattern) code. In almost every case, it can be replaced by `.map`, `.filter`, or a `for-of` loop. It's only somewhat useful in the rare case of summing up numbers.

Use `eslint-disable` comment if you really need to use it.

This rule is not fixable.

## Fail

```js
array.reduce(reducer, initialValue);
```

```js
array.reduceRight(reducer, initialValue);
```

```js
array.reduce(reducer);
```

```js
[].reduce.call(array, reducer);
```

```js
[].reduce.apply(array, [reducer, initialValue]);
```

```js
Array.prototype.reduce.call(array, reducer);
```

## Pass

```js
// eslint-disable-next-line unicorn/no-array-reduce
array.reduce(reducer, initialValue);
```

```js
let result = initialValue;

for (const element of array) {
	result += element;
}
```
