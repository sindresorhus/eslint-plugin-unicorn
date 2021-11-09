# Prefer `.at()` method for index access and `String#charAt()`

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*

Prefer [`Array#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at), [`String#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/at), and `{TypedArray,NodeList,CSSRuleList,…}#at()` for index access and `String#charAt()`.

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
const foo = string.charAt(string.length - 5);
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

```js
// This rule is not checking this case, but `unicorn/prefer-negative-index` rule will fix it.
const foo = array.at(array.length - 1);
```

```js
array[array.length - 1] = foo;
```

## Options

Type: `object`

### checkAllIndexAccess

Type: `boolean`\
Default: `false`

This rule only check negative indexes by default, but you can also check positive indexes by setting `checkAllIndexAccess` to `true`.

Example:

```js
{
	'unicorn/prefer-at': [
		'error',
		{
			checkAllIndexAccess: true
		}
	]
}
```

```js
// eslint unicorn/prefer-at: ["error", {"checkAllIndexAccess": true}]
const foo = bar[10]; // Fails, will fix to `bar.at(10)`
const foo = bar[unknownProperty]; // Passes
const foo = string.charAt(unknownIndex); // Fails
```

### getLastElementFunctions

Type: `string[]`

You can also check custom functions that get last element of objects.

`_.last()`, `lodash.last()`, and `underscore.last()` are always checked.

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

## Related rules

- [unicorn/prefer-negative-index](./prefer-negative-index.md)
