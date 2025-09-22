# Prefer `Array#{indexOf,lastIndexOf}()` over `Array#{findIndex,findLastIndex}()` when looking for the index of an item

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) and [`Array#findLastIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLastIndex) are intended for more complex needs. If you are just looking for the index where the given item is present, then the code can be simplified to use [`Array#indexOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf) or [`Array#lastIndexOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/lastIndexOf). This applies to any search with a literal, a variable, or any expression that doesn't have any explicit side effects. However, if the expression you are looking for relies on an item related to the function (its arguments, the function self, etc.), the case is still valid.

This rule is fixable, unless the search expression has side effects.

## Examples

```js
// ❌
const index = foo.findIndex(x => x === 'foo');

// ❌
const index = foo.findIndex(x => 'foo' === x);

// ❌
const index = foo.findIndex(x => {
	return x === 'foo';
});

// ✅
const index = foo.indexOf('foo');
```

```js
// ❌
const index = foo.findLastIndex(x => x === 'foo');

// ❌
const index = foo.findLastIndex(x => 'foo' === x);

// ❌
const index = foo.findLastIndex(x => {
	return x === 'foo';
});

// ✅
const index = foo.lastIndexOf('foo');
```

```js
// ✅
const index = foo.findIndex(x => x == undefined);
```

```js
// ✅
const index = foo.findIndex(x => x !== 'foo');
```

```js
// ✅
const index = foo.findIndex((x, index) => x === index);
```

```js
// ✅
const index = foo.findIndex(x => (x === 'foo') && isValid());
```

```js
// ✅
const index = foo.findIndex(x => y === 'foo');
```

```js
// ✅
const index = foo.findIndex(x => y.x === 'foo');
```

```js
// ✅
const index = foo.findIndex(x => {
	const bar = getBar();
	return x === bar;
});
```

```js
// ✅
const index = foo.findLastIndex(x => x == undefined);
```

```js
// ✅
const index = foo.findLastIndex(x => x !== 'foo');
```

```js
// ✅
const index = foo.findLastIndex((x, index) => x === index);
```

```js
// ✅
const index = foo.findLastIndex(x => (x === 'foo') && isValid());
```

```js
// ✅
const index = foo.findLastIndex(x => y === 'foo');
```

```js
// ✅
const index = foo.findLastIndex(x => y.x === 'foo');
```

```js
// ✅
const index = foo.findLastIndex(x => {
	const bar = getBar();
	return x === bar;
});
```
