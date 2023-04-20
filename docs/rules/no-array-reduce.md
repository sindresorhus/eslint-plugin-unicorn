# Disallow `Array#reduce()` and `Array#reduceRight()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#reduce()` and `Array#reduceRight()` usually result in [hard-to-read](https://twitter.com/jaffathecake/status/1213077702300852224) and [less performant](https://www.richsnapp.com/article/2019/06-09-reduce-spread-anti-pattern) code. In almost every case, it can be replaced by `.map`, `.filter`, or a `for-of` loop.

It's only somewhat useful in the rare case of summing up numbers, which is allowed by default.

Use `eslint-disable` comment if you really need to use it or disable the rule entirely if you prefer functional programming.

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
array.reduce((total, value) => total + value);
```

```js
let result = initialValue;

for (const element of array) {
	result += element;
}
```

## Options

### allowSimpleOperations

Type: `boolean`\
Default: `true`

Allow simple operations (like addition, subtraction, etc.) in a `reduce` call.

Set it to `false` to disable reduce completely.

```js
// eslint unicorn/no-array-reduce: ["error", {"allowSimpleOperations": true}]
array.reduce((total, item) => total + item) // Passes
```

```js
// eslint unicorn/no-array-reduce: ["error", {"allowSimpleOperations": false}]
array.reduce((total, item) => total + item) // Fails
```
