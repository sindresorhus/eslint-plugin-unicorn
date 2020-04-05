# Enforce a specific parameter name in catch clauses

Applies to

- `try/catch` clauses handlers
- `promise.catch(…)` handlers
- `promise.then(onFulfilled, …)` handlers

The desired name is [configurable](#name), but defaults to `error`.

The following names are ignored:

- `_`, but only if the error is not used.
- Descriptive names, for example, `fsError` or `authError`.
- Names matching [`options.ignore`](#ignore).

This rule is fixable.

## Fail

```js
try {
	doSomething();
} catch (badName) {
	// …
}
```

```js
somePromise.catch(badName => {})
```

```js
somePromise.then(undefined, badName => {})
```

## Pass

```js
try {
	doSomething();
} catch (error) {
	// …
}
```

```js
somePromise.catch(error => {})
```

```js
somePromise.then(undefined, error => {})
```

```js
try {
	doSomething();
} catch (_) {
	// `_` is allowed when the error is not used
	console.log(foo);
}
```

```js
const handleError = error => {
	const error_ = new Error('🦄');

	obj.catch(error__ => {
		// `error__` is allowed because of shadowed variables
	});
}
```

## Options

### name

Type: `string`\
Default: `'error'`

You can set the `name` option like this:

```js
"unicorn/catch-error-name": [
	"error",
	{
		"name": "exception"
	}
]
```

### ignore

Type: `Array<string | RegExp>`\
Default: `[]`

This option lets you specify a regex pattern for matches to ignore.

When a string is given, it's interpreted as a regular expressions inside a string. Needed for ESLint config in JSON.

```js
"unicorn/catch-error-name": [
	"error",
	{
		"ignore": [
			"^error\\d*$",
			/^ignore/i
		]
	}
]
```

With `^unicorn$`, this would fail:

```js
try {
	doSomething();
} catch (pony) {
	// …
}
```

And this would pass:

```js
try {
	doSomething();
} catch (unicorn) {
	// …
}
```

## Tip

In order to avoid shadowing in nested catch clauses, the auto-fix rule appends underscores to the identifier name.
