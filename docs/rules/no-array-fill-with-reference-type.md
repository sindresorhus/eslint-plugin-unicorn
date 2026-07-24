# no-array-fill-with-reference-type

📝 Disallow using reference values as `Array#fill()` values.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#fill()` uses the same value for every array element. When that value is a reference, mutating one element also affects the others.

Create the value inside an `Array.from()` mapping function when each array element should receive a fresh object.

A receiver known not to be an array is ignored, including a typed array, since [`TypedArray#fill()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/fill) coerces the value to a number and no two elements can end up sharing a reference. Unknown receivers are still reported.

## Examples

```js
// ❌
new Array(3).fill({});
```

```js
// ✅
Array.from({length: 3}, () => ({}));
```

```js
// ❌
const value = new Map();
array.fill(value);
```

```js
// ✅
array.fill(0);
```
