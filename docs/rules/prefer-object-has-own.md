# Prefer `Object.hasOwn(…)` over `Object.prototype.hasOwnProperty.call(…)`

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

[`Object.hasOwn(…)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn) is more accessible than `Object.prototype.hasOwnProperty.call(…)`.

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

`_.has()`, `lodash.has()`, and `underscore.has()` are always checked.

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
