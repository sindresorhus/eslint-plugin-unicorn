# Prefer `Array#flat()` over legacy techniques to flatten arrays

ES2019 introduced a new method [`Array#flat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) that flatten arrays.

This rule is fixable.

## Fail

```js
const foo = bar.flatMap(x => x);
```

```js
const foo = bar.reduce((a, b) => a.concat(b), []);
```

```js
const foo = bar.reduce((a, b) => [...a, ...b], []);
```

```js
const foo = [].concat(bar);
```

```js
const foo = [].concat(...bar);
```

```js
const foo = [].concat.apply([], bar);
```

```js
const foo = Array.prototype.concat.apply([], bar);
```

```js
const foo = _.flatten(bar);
```

```js
const foo = lodash.flatten(bar);
```

```js
const foo = underscore.flatten(bar);
```

## Pass

```js
const foo = bar.flat();
```

## Options

Type: `object`

### functions

Type: `string[]`

You can also check custom functions that flatten arrays.

Example:

```js
{
	'unicorn/prefer-array-flat': [
		'error',
		{
			functions: [
				'flatArray',
				'utils.flat'
			]
		}
	]
}
```

```js
// eslint unicorn/prefer-array-flat: ["error", {"functions": ["utils.flat"]}]
const foo = utils.flat(bar); // Fails
```
