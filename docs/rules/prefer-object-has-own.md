# Prefer `Object.hasOwn(…)` over `Object.prototype.hasOwnProperty.call(…)`

[`Object.hasOwn(…)`](https://github.com/tc39/proposal-accessible-object-hasownproperty) is more accessible than `Object.prototype.hasOwnProperty.call(…)`.

This rule is fixable.

## Fail

```js
const hasProperty = Object.prototype.hasOwnProperty.call(object, property);
```

```js
const hasProperty = {}.hasOwnProperty.call(object, property);
```

```js
const hasProperty = lodash.has(object, property);
```

## Pass

```js
const hasProperty = Object.hasOwn(object, property);
```

## Options

Type: `object`

### functions

Type: `string[]`

You can also check custom functions that indicating the object has the specified property as its own property.

`_.has()`, `lodash.has()`, and `underscore.has()` are checked by default.

Example:

```js
{
	'unicorn/prefer-object-has-own': [
		'error',
		{
			functions: [
				'has',
				'utils.has',
			]
		}
	]
}
```

```js
// eslint unicorn/prefer-object-has-own: ["error", {"functions": ["utils.has"]}]
const hasProperty = utils.has(object, property); // Fails
```
