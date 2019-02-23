# Prevent abbreviations

Using complete words results in more readable code. Not everyone knows all your abbreviations. You only write code once, but it's read many times.

Default replacements are available [here](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/rules/prevent-abbreviations.js#L7).

This rule is fixable for abbreviations with exactly one replacement defined.


## Fail

```js
const e = new Error();
```

```js
const e = document.createEvent('Event');
```


## Pass

```js
const error = new Error();
```

```js
const event = document.createEvent('Event');
```


## Options

### replacements

You can extend default replacements by passing this option.

The example below disables the default `e` => `event` replacement and adds a custom `cmd` => `command` one.

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

The example below disables all the default replacements and enables a custom `cmd` => `command` one.

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


## Edge cases

### arguments

This rule does not report or fix `args` → `arguments` when it would result in a collision with the built-in [`arguments` object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments);
