# Prevent abbreviations

Using complete words results in more readable code. Not everyone knows all your abbreviations. Code is written only once, but read many times.

This rule can also be used to replace terms, disallow words, etc. See the [`replacements`](#replacements) and [`extendDefaultReplacements`](#extenddefaultreplacements) options.

You can find the default replacements [here](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/rules/prevent-abbreviations.js#L13).

This rule is fixable only for variable names with exactly one replacement defined.


## Fail

```js
const e = new Error();
```

```js
const e = document.createEvent('Event');
```

```js
const levels = {
	err: 0
};
```

```js
this.evt = 'click';
```

```js
class Btn {}
```


## Pass

```js
const error = new Error();
```

```js
const event = document.createEvent('Event');
```

```js
const levels = {
	error: 0
};
```

```js
this.event = 'click';
```

```js
class Button {}
```


## Options

Type: `object`

### replacements

Type: `object`

You can extend default replacements by passing the `replacements` option.

Lowercase replacements will match both camelcase and pascalcase identifiers. For example, `err` will match both `err` and `Err`. `errCb` will match both `errCb` and `ErrCb`.

Lowercase replacements will match both complete identifiers and separate words inside identifiers. For example, `cmd` will match all of `cmd`, `createCmd` and `CmdFactory`.

Camelcase replacements will only match complete identifiers. For example `errCb` will only match `errCb` and `ErrCb`. It will not match `fooErrCb` or `errCbFoo`.

The example below:
- disables the default `e` → `event` replacement (leaving `e` → `error` enabled),
- disables `res` replacement completely (both `res` → `response` and `res` → `result` from defaults are disabled),
- adds a custom `cmd` → `command` replacement,
- adds a custom `errCb` → `handleError` replacement.

```js
"unicorn/prevent-abbreviations": [
	"error",
	{
		"replacements": {
			"e": {
				"event": false
			},
			"res": false,
			"cmd": {
				"command": true
			},
			"errCb": {
				"handleError": true
			}
		}
	}
]
```

### extendDefaultReplacements

Type: `boolean`<br>
Default: `true`

Pass `"extendDefaultReplacements": false` to override the default `replacements` completely.

The example below disables all the default replacements and enables a custom `cmd` → `command` one.

```js
"unicorn/prevent-abbreviations": [
	"error",
	{
		"extendDefaultReplacements": false,
		"replacements": {
			"cmd": {
				"command": true
			}
		}
	}
]
```

### whitelist

Type: `object`

You can extend the default whitelist by passing the `whitelist` option.

Unlike the `replacements` option, `whitelist` matches full identifier names case-sensitively.

For example, if you want to report `props` → `properties` (enabled by default), but allow `getInitialProps`, you could use the following configuration.

```js
"unicorn/prevent-abbreviations": [
	"error",
	{
		"whitelist": {
			"getInitialProps": true
		}
	}
]
```

### extendDefaultWhitelist

Type: `boolean`<br>
Default: `true`

Pass `"extendDefaultWhitelist": false` to override the default `whitelist` completely.

### checkDefaultAndNamespaceImports

Type: `boolean`<br>
Default: `false`

Pass `"checkDefaultAndNamespaceImports": true` to check variables declared in default or namespace import.

With this set to `true` the following code will be reported.

```js
import tempWrite from 'temp-write';
```

```js
import * as err from 'err';
```

```js
const err = require('err');
```

### checkShorthandImports

Type: `boolean`<br>
Default: `false`

Pass `"checkShorthandImports": true` to check variables declared in shorthand import.

With this set to `true` the following code will be reported.

```js
import {prop} from 'ramda';
```

### checkShorthandProperties

Type: `boolean`<br>
Default: `false`

Pass `"checkShorthandProperties": true` to check variables declared as shorhand properties in object destructuring.

With this set to `true` the following code will be reported.

```js
const {prop} = require('ramda');
```

```js
const {err} = foo;
```

```js
function f({err}) {}
```

### checkProperties

Type: `boolean`<br>
Default: `true`

Pass `"checkProperties": false` to disable checking property names.

### checkVariables

Type: `boolean`<br>
Default: `true`

Pass `"checkVariables": false` to disable checking variable names.
