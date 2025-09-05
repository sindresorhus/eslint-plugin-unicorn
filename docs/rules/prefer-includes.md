# Prefer `.includes()` over `.indexOf()`, `.lastIndexOf()`, and `Array#some()` when checking for existence or non-existence

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

All built-ins have `.includes()` in addition to `.indexOf()` and `.lastIndexOf()`. Prefer `.includes()` over comparing the value of `.indexOf()` and `.lastIndexOf()`.

[`Array#some()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) is intended for more complex needs. If you are just looking for the index where the given item is present, the code can be simplified to use [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes). This applies to any search with a literal, a variable, or any expression that doesn't have any explicit side effects. However, if the expression you are looking for relies on an item related to the function (its arguments, the function self, etc.), the case is still valid.

This rule is fixable, unless the search expression in `Array#some()` has side effects.

## Fail

```js
array.indexOf('foo') !== -1;
```

```js
string.lastIndexOf('foo') !== -1;
```

```js
array.lastIndexOf('foo') !== -1;
```

```js
foo.indexOf('foo') != -1;
```

```js
foo.indexOf('foo') >= 0;
```

```js
foo.indexOf('foo') > -1;
```

```js
foo.indexOf('foo') === -1
```

```js
foo.some(x => x === 'foo');
```

```js
foo.some(x => 'foo' === x);
```

```js
foo.some(x => {
	return x === 'foo';
});
```

## Pass

```js
foo.indexOf('foo') !== -n;
```

```js
foo.indexOf('foo') !== 1;
```

```js
foo.indexOf('foo') === 1;
```

```js
foo.includes('foo');
```

```js
foo.includes(4);
```

```js
foo.includes('foo');
```

```js
foo.some(x => x == undefined);
```

```js
foo.some(x => x !== 'foo');
```

```js
foo.some((x, index) => x === index);
```

```js
foo.some(x => (x === 'foo') && isValid());
```

```js
foo.some(x => y === 'foo');
```

```js
foo.some(x => y.x === 'foo');
```

```js
foo.some(x => {
	const bar = getBar();
	return x === bar;
});
```
