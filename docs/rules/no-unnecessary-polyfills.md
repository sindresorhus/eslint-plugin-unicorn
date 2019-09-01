# Enforce the use of built-in methods instead of unnecessary polyfills

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
const objectAssign = require('object-assign');
```

## Pass

package.json
```json
{
	"engines": {
		"node": "<4.0.0"
	}
}

```
```js
const assign = require("object-assign"); // passes as Object.assign is not supported
```

## Options

By default it takes node version from `package.json`. However you can override
target node version:

```js
"unicorn/no-unnecessary-polyfills": ["error", {"targetVersion": "6"}]
```
