# Enforce a specific parameter name in catch clauses

Applies to both `try/catch` clauses and `promise.catch(...)` handlers.

The desired name is configurable, but defaults to `error`.

This rule is fixable unless the reported code was destructuring an error.


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
} catch (anyName) { // Nesting of catch clauses disables the rule
	try {
		doSomethingElse();
	} catch (anyOtherName) {
		// ...
	}
}
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
		"caughtErrorsIgnorePattern": "^_$"
	}
]
```

This option lets you specify a regex pattern for matches to ignore. The default is `^_$`.

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
