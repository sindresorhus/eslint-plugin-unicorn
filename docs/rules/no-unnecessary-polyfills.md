# Enforce the use of built-in methods instead of unnecessary polyfills

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

<!-- end auto-generated rule header -->

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->

✅ _This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config._

<!-- /RULE_NOTICE -->

This rules helps to use existing methods instead of using extra polyfills.

## Fail

package.json

```json
{
	"engines": {
		"node": ">=8"
	}
}
```

```js
const assign = require('object-assign');
```

## Pass

package.json

```json
{
	"engines": {
		"node": "4"
	}
}
```

```js
const assign = require('object-assign'); // Passes as Object.assign is not supported
```

## Options

Type: `object`

### targets

Type: `string | string[] | object`

The `targets` option allows to specify the target versions. This option could be a Browserlist query or a targets object, see [core-js-compat `targets` option](https://github.com/zloirock/core-js/tree/HEAD/packages/core-js-compat#targets-option) for more informations.

If the option is not specified, target versions are defined using the [`browserlist`](https://browsersl.ist) field, or as a last resort, the `engines` field in `package.json`.

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
