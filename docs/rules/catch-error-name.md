# Enforce a specific parameter name in catch clauses

Applies to both `try/catch` clauses and `promise.catch(…)` handlers.

The desired name is configurable, but defaults to `error`.

The error name `_` is ignored if the error is not used.

This rule is fixable.

## Fail

```js
try {
	doSomething();
} catch (ohNoes) {
	// …
}
```

```js
somePromise.catch(e => {})
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

```js
somePromise.catch(_ => {
	// `_` is allowed when the error is not used
	console.log(foo);
});
```

## Options

### name

You can set the `name` option like this:

```js
"unicorn/catch-error-name": [
	"error",
	{
		"name": "error"
	}
]
```

### caughtErrorsIgnorePattern

```js
"unicorn/catch-error-name": [
	"error",
	{
		"caughtErrorsIgnorePattern": "^error\\d*$"
	}
]
```

This option lets you specify a regex pattern for matches to ignore. The default allows descriptive names like `networkError`.

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

In order to avoid shadowing in nested catch clauses, the auto-fix rule appends underscores to the identifier name. Since this might be hard to read, the default setting for `caughtErrorsIgnorePattern` allows the use of descriptive names instead, for example, `fsError` or `authError`.
