# Enforce a specific parameter name in catch clauses

Applies to both `try/catch` clauses and `promise.catch(...)` handlers.

The desired name is configurable, but defaults to `err`.


## Fail

```js
try {
	doSomething();
} catch (error) {
	// ...
}
```

```js
somePromise.catch(e => {})
```


## Pass

```js
try {
	doSomething();
} catch (err) {
	// ...
}
```

```js
somePromise.catch(err => {})
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
const handleError = err => {
	const err2 = new Error('foo bar');

	obj.catch(err3 => {
		// `err3` is allowed because of shadowed variables
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
"unicorn/catch-error-name": ["error", {"name": "err"}]
```

### caughtErrorsIgnorePattern

```js
"unicorn/catch-error-name": ["error", {"caughtErrorsIgnorePattern": "^_$"}]
```

This option lets you specify a regex pattern for matches to ignore. Default is `^_$`.

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
