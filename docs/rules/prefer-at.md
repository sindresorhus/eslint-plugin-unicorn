# Prefer `.at()` method for negative index access

When access "negative indexing" of objects, prefer [`Array#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at), [`String#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/at), and `{Uint8Array,NodeList,CSSRuleList,…}#at()` over `.length - index`.

This rule is fixable.

## Fail

```js
const foo = array[array.length - 1];
```

```js
const foo = array[array.length - 5];
```

```js
const foo = array.slice(-1)[0];
```

```js
const foo = array.slice(-1).pop();
```

```js
const foo = array.slice(-5).shift();
```

```js
const foo = lodash.last(array);
```

## Pass

```js
const foo = array.at(-1);
```

```js
const foo = array.at(-5);
```

```js
const foo = array[100];
```

## Options

Type: `object`

### getLastElementFunctions

Type: `string[]`

You can also check custom functions that get last element of objects.

`_.last()`, `lodash.last()`, and `underscore.last()` are checked by default.

Example:

```js
{
	'unicorn/prefer-at': [
		'error',
		{
			getLastElementFunctions: [
				'getLast',
				'utils.lastElement'
			]
		}
	]
}
```

```js
// eslint unicorn/prefer-at: ["error", {"getLastElementFunctions": ["utils.lastElement"]}]
const foo = utils.lastElement(bar); // Fails
```
