# Prefer using `Object.fromEntries(…)` to transform a list of key-value pairs into an object

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When transforming a list of key-value pairs into an object, [`Object.fromEntries(…)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries) should be preferred. [`no-array-reduce`](no-array-reduce.md) is a related but more generic rule.

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
