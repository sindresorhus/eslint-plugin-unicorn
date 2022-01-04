# Prefer using `Object.fromEntries(…)` to transform a list of key-value pairs into an object

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

When transforming a list of key-value pairs into an object, [`Object.fromEntries(…)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries) should be preferred.

This rule is fixable for simple cases.

## Fail

```js
const object = pairs.reduce(
	(object, [key, value]) => ({...object, [key]: value}),
	{}
);
```

```js
const object = pairs.reduce(
	(object, [key, value]) => ({...object, [key]: value}),
	Object.create(null)
);
```

```js
const object = pairs.reduce(
	(object, [key, value]) => Object.assign(object, {[key]: value}),
	{}
);
```

```js
const object = pairs.reduce(addPairToObject, {});
```

```js
const object = _.fromPairs(pairs);
```

## Pass

```js
const object = Object.fromEntries(pairs);
```

```js
const object = new Map(pairs);
```

## Options

Type: `object`

### functions

Type: `string[]`

You can also check custom functions that transforms pairs.

`lodash.fromPairs()` and `_.fromPairs()` are always checked.

Example:

```js
{
	'unicorn/prefer-object-from-entries': [
		'error',
		{
			functions: [
				'getObjectFromKeyValue',
				'utils.fromPairs'
			]
		}
	]
}
```

```js
// eslint unicorn/prefer-object-from-entries: ["error", {"functions": ["utils.fromPairs"]}]
const object = utils.fromPairs(pairs); // Fails
```
