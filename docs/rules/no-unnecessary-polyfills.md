# Enforce the use of built-in methods instead of unnecessary polyfills

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

This rule helps to use existing methods instead of using extra polyfills.

## Examples

package.json

```js
// package.json
{
	"engines": {
		"node": ">=8"
	}
}

// ❌
import assign from 'object-assign';
```

```js
// package.json
{
	"engines": {
		"node": "4"
	}
}

// ✅
import assign from 'object-assign'; // Passes as Object.assign is not supported
```

## Options

Type: `object`

### targets

Type: `string | string[] | object`

Specify the target versions, which could be a Browserslist query or a targets object. See the [core-js-compat `targets` option](https://github.com/zloirock/core-js/tree/HEAD/packages/core-js-compat#targets-option) for more info.

If the option is not specified, the target versions are defined using the [`browserslist`](https://browsersl.ist) field in package.json, or as a last resort, the `engines` field in package.json.

```js
"unicorn/no-unnecessary-polyfills": [
	"error",
	{
		"targets": "node >=12"
	}
]
```

```js
"unicorn/no-unnecessary-polyfills": [
	"error",
	{
		"targets": [
			"node 14.1.0",
			"chrome 95"
		]
	}
]
```

```js
"unicorn/no-unnecessary-polyfills": [
	"error",
	{
		"targets": {
			"node": "current",
			"firefox": "15"
		}
	}
]
```
