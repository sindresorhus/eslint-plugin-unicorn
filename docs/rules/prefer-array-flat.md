# Prefer `Array#flat()` over legacy techniques to flatten arrays

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

ES2019 introduced a new method [`Array#flat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) that flatten arrays.

## Examples

```js
// ❌
const foo = array.flatMap(x => x);

// ❌
const foo = array.reduce((a, b) => a.concat(b), []);

// ❌
const foo = array.reduce((a, b) => [...a, ...b], []);

// ❌
const foo = [].concat(...array);

// ❌
const foo = [].concat.apply([], array);

// ❌
const foo = Array.prototype.concat.apply([], array);

// ❌
const foo = Array.prototype.concat.call([], ...array);

// ❌
const foo = _.flatten(array);

// ❌
const foo = lodash.flatten(array);

// ❌
const foo = underscore.flatten(array);

// ✅
const foo = array.flat();
```

```js
// ❌
const foo = [].concat(maybeArray);

// ❌
const foo = Array.prototype.concat.call([], maybeArray);

// ✅
const foo = [maybeArray].flat();
```

## Options

Type: `object`

### functions

Type: `string[]`

You can also check custom functions that flatten arrays.

`_.flatten()`, `lodash.flatten()`, and `underscore.flatten()` are always checked.

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
/* eslint unicorn/prefer-array-flat: ["error", {"functions": ["utils.flat"]}] */
// ❌
const foo = utils.flat(bar);
```

## Related rules

- [unicorn/prefer-array-flat-map](./prefer-array-flat-map.md)
