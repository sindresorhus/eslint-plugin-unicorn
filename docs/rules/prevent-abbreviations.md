# Prevent abbreviations

Using complete words results in more readable code. Not everyone knows all your abbreviations. You only write code once, but it's read many times.

This rule can also be used to replace terms, disallowed words, etc. See [`replacements`](#replacements) and [`extendDefaultReplacements`](#extenddefaultreplacements) options.

Default replacements are available [here](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/rules/prevent-abbreviations.js#L13).

This rule is fixable only for variable names where abbreviation has with exactly one replacement defined.


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

### replacements

You can extend default replacements by passing this option.

The example below disables the default `e` → `event` replacement and adds a custom `cmd` → `command` one.

Replacements should be lowercase and will match both camelcase and pascalcase identifiers. For example, `err` will match both `err` and `Err`.

Replacements will also match separate words inside identifiers. For example, `cmd` will match all of `cmd`, `createCmd` and `CmdFactory`.

```js
"unicorn/prevent-abbreviations": [
	"error",
	{
		"replacements": {
			"cmd": {
				"command": true
			},
			"e": {
				"event": false
			}
		}
	}
]
```

### extendDefaultReplacements

Pass `false` here to override the default `replacements` completely.

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

### checkPropertyNames

Pass `false` here to disable checking property names.

### checkVariableNames

Pass `false` here to disable checking variable names.


## Edge cases

### arguments

This rule does not report or fix `args` → `arguments` when it would result in a collision with the built-in [`arguments` object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments);
