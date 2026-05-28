# no-array-reduce

📝 Disallow `Array#reduce()` and `Array#reduceRight()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#reduce()` and `Array#reduceRight()` usually result in [hard-to-read](https://twitter.com/jaffathecake/status/1213077702300852224) and [less performant](https://www.richsnapp.com/article/2019/06-09-reduce-spread-anti-pattern) code. In almost every case, it can be replaced by `.map`, `.filter`, or a `for-of` loop.

It's only somewhat useful in the rare case of summing up numbers, which is allowed by default.

Use `eslint-disable` comment if you really need to use it or disable the rule entirely if you prefer functional programming.

This rule can automatically fix common direct `Array#reduce()` calls on local `const` array bindings used as a single variable initializer. Inline reducer callbacks and local `const` callback identifiers declared before the `reduce` call with simple inline-compatible bodies are fixed. More complex cases, `Array#reduceRight()`, and `Array#reduce.call()`/`Array#reduce.apply()` are reported without a fix.

## Examples

```js
// ❌
array.reduce(reducer);

// ❌
array.reduce(reducer, initialValue);

// ❌
[].reduce.call(array, reducer);

// ✅
let result = initialValue;

for (const element of array) {
	result += element;
}
```

```js
// ✅
array.reduce((total, value) => total + value);
```

```js
// ❌
array.reduceRight(reducer, initialValue);

// ✅
let result = initialValue;

for (const element of array.toReversed()) { // Equivalent to .reduceRight()
	result += element;
}
```

```js
// ❌
[].reduce.apply(array, [reducer, initialValue]);

// ✅
let result = initialValue;

for (const element of array) {
	result = reducer(result, element);
}
```

```js
// ❌
Array.prototype.reduce.call(array, reducer);

// ✅
// eslint-disable-next-line unicorn/no-array-reduce
array.reduce(reducer);
```

## Options

### allowSimpleOperations

Type: `boolean`\
Default: `true`

Allow simple operations (like addition, subtraction, etc.) in a `reduce` call.

Set it to `false` to disable reduce completely.

```js
/* eslint unicorn/no-array-reduce: ["error", {"allowSimpleOperations": true}] */
// ✅
array.reduce((total, item) => total + item)
```

```js
/* eslint unicorn/no-array-reduce: ["error", {"allowSimpleOperations": false}] */
// ❌
array.reduce((total, item) => total + item)

// ✅
let total = 0;

for (const item of array) {
	total += item;
}
```
