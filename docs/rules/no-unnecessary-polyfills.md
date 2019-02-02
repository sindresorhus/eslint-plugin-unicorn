# Enforce to use built in method instead of unnecessary polyfills

Takes node version from `package.json` and warns to use supported built in methods
instead of using unnecessary polyfills.

The desired name is configurable, but defaults to `error`.

## Fail

package.json
```json5
{
	"engines": {
		"node": ">8.0.0"
	}
}

```
```js
const assign = require("object-assign"); // warns to use built in Object.assign
```

## Pass

package.json
```json5
{
	"engines": {
		"node": "<4.0.0"
	}
}

```
```js
const assign = require("object-assign"); // passes as Object.assign is not supported
```
