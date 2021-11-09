# Prefer `.includes()` over `.indexOf()` and `Array#some()` when checking for existence or non-existence

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

All built-ins have `.includes()` in addition to `.indexOf()`. Prefer `.includes()` over comparing the value of `.indexOf()`.

[`Array#some()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) is intended for more complex needs. If you are just looking for the index where the given item is present, the code can be simplified to use [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes). This applies to any search with a literal, a variable, or any expression that doesn't have any explicit side effects. However, if the expression you are looking for relies on an item related to the function (its arguments, the function self, etc.), the case is still valid.

This rule is fixable, unless the search expression in `Array#some()` has side effects.

## Fail

```js
[].indexOf('foo') !== -1;
```

```js
x.indexOf('foo') != -1;
```

```js
str.indexOf('foo') > -1;
```

```js
'foobar'.indexOf('foo') >= 0;
```

```js
x.indexOf('foo') === -1
```

```js
const isFound = foo.some(x => x === 'foo');
```

```js
const isFound = foo.some(x => 'foo' === x);
```

```js
const isFound = foo.some(x => {
	return x === 'foo';
});
```

## Pass

```js
const str = 'foobar';
```

```js
str.indexOf('foo') !== -n;
```

```js
str.indexOf('foo') !== 1;
```

```js
!str.indexOf('foo') === 1;
```

```js
!str.indexOf('foo') === -n;
```

```js
str.includes('foo');
```

```js
[1,2,3].includes(4);
```

```js
const isFound = foo.includes('foo');
```

```js
const isFound = foo.some(x => x == undefined);
```

```js
const isFound = foo.some(x => x !== 'foo');
```

```js
const isFound = foo.some((x, index) => x === index);
```

```js
const isFound = foo.some(x => (x === 'foo') && isValid());
```

```js
const isFound = foo.some(x => y === 'foo');
```

```js
const isFound = foo.some(x => y.x === 'foo');
```

```js
const isFound = foo.some(x => {
	const bar = getBar();
	return x === bar;
});
```
