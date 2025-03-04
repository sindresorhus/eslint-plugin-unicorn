# Prefer using `structuredClone` to create a deep clone

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone) is the modern way to create a deep clone of a value.

## Fail

```js
const clone = JSON.parse(JSON.stringify(foo));
```

```js
const clone = _.cloneDeep(foo);
```

## Pass

```js
const clone = structuredClone(foo);
```

## Options

Type: `object`

### functions

Type: `string[]`

You can also check custom functions that creates a deep clone.

`_.cloneDeep()` and `lodash.cloneDeep()` are always checked.

Example:

```js
{
	'unicorn/prefer-structured-clone': [
		'error',
		{
			functions: [
				'cloneDeep',
				'utils.clone'
			]
		}
	]
}
```

```js
// eslint unicorn/prefer-structured-clone: ["error", {"functions": ["utils.clone"]}]
const clone = utils.clone(foo); // Fails
```
