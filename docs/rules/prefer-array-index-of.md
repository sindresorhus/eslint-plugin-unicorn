# Prefer `Array#indexOf()` over `Array#findIndex()` when looking for the index of an item

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

[`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) is intended for more complex needs. If you are just looking for the index where the given item is present, then the code can be simplified to use [`Array#indexOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf). This applies to any search with a literal, a variable, or any expression that doesn't have any explicit side effects. However, if the expression you are looking for relies on an item related to the function (its arguments, the function self, etc.), the case is still valid.

This rule is fixable, unless the search expression has side effects.

## Fail

```js
const index = foo.findIndex(x => x === 'foo');
```

```js
const index = foo.findIndex(x => 'foo' === x);
```

```js
const index = foo.findIndex(x => {
	return x === 'foo';
});
```

## Pass

```js
const index = foo.indexOf('foo');
```

```js
const index = foo.findIndex(x => x == undefined);
```

```js
const index = foo.findIndex(x => x !== 'foo');
```

```js
const index = foo.findIndex((x, index) => x === index);
```

```js
const index = foo.findIndex(x => (x === 'foo') && isValid());
```

```js
const index = foo.findIndex(x => y === 'foo');
```

```js
const index = foo.findIndex(x => y.x === 'foo');
```

```js
const index = foo.findIndex(x => {
	const bar = getBar();
	return x === bar;
});
```
