# Prevent abbreviations

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using complete words results in more readable code. Not everyone knows all your abbreviations. Code is written only once, but read many times.

This rule can also be used to replace terms, disallow words, etc. See the [`replacements`](#replacements) and [`extendDefaultReplacements`](#extenddefaultreplacements) options.

You can find the default replacements [here](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/rules/shared/abbreviations.js).

This rule is fixable only for variable names with exactly one replacement defined.

## Fail

```js
const e = new Error();
```

```js
const e = document.createEvent('Event');
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

```js
// Property is not checked by default
const levels = {
	err: 0
};
```

```js
// Property is not checked by default
this.evt = 'click';
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

Type: `boolean`\
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

### allowList

Type: `object`

You can extend the default allowList by passing the `allowList` option.

Unlike the `replacements` option, `allowList` matches full identifier names case-sensitively.

For example, if you want to report `props` → `properties` (enabled by default), but allow `getInitialProps`, you could use the following configuration.

```js
"unicorn/prevent-abbreviations": [
	"error",
	{
		"allowList": {
			"getInitialProps": true
		}
	}
]
```

### extendDefaultAllowList

Type: `boolean`\
Default: `true`

Pass `"extendDefaultAllowList": false` to override the default `allowList` completely.

### checkDefaultAndNamespaceImports

Type: `'internal' | boolean`\
Default: `'internal'`

- `'internal'` - Check variables declared in default or namespace import, **but only for internal modules**.
- `true` - Check variables declared in default or namespace import.
- `false` - Don't check variables declared in default or namespace import.

By default, the following code will be reported:

```js
import * as err from './err';
```

```js
import err from '/err';
```

With this set to `true`, the following code will be reported:

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

Type: `'internal'` | `boolean`\
Default: `'internal'`

- `'internal'` - Check variables declared in shorthand import, **but only for internal modules**.
- `true` - Check variables declared in shorthand import.
- `false` - Don't check variables declared in default shorthand import.

By default, the following code will be reported:

```js
import {prop} from './foo';
```

With this set to `true`, the following code will be reported:

```js
import {prop} from 'ramda';
```

### checkShorthandProperties

Type: `boolean`\
Default: `false`

Pass `"checkShorthandProperties": true` to check variables declared as shorthand properties in object destructuring.

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

Type: `boolean`\
Default: `false`

Pass `"checkProperties": true` to enable checking property names.

### checkVariables

Type: `boolean`\
Default: `true`

Pass `"checkVariables": false` to disable checking variable names.

### checkFilenames

Type: `boolean`\
Default: `true`

Pass `"checkFilenames": false` to disable checking file names.

### ignore

Type: `Array<string | RegExp>`\
Default: `[]`

This option lets you specify a regex pattern for matches to ignore.

When a string is given, it's interpreted as a regular expressions inside a string. Needed for ESLint config in JSON.

```js
"unicorn/prevent-abbreviations": [
	"error",
	{
		"ignore": [
			"\\.e2e$",
			/^ignore/i
		]
	}
]
```

When checking filenames, only the basename is tested. For example, with a file named `foo.e2e.js`, `ignore: [/\.e2e$/]` would pass and `ignore: [/\.e2e\.js/]` would fail.
