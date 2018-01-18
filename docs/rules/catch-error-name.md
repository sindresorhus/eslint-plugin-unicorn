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

### Name

You can set the `name` option like this:

```js
"unicorn/catch-error-name": ["error", {"name": "err"}]
```

### caughtErrorsIgnorePattern

```js
"unicorn/catch-error-name": ["error", {"caughtErrorsIgnorePattern": "^ignore"}]
```

The `caughtErrorsIgnorePattern` option specifies exceptions not to check for usage: catch arguments whose names match a regexp pattern. 
For example, variables whose names begin with a string ‘ignore’.

## Fail

```js
try {
	doSomething();
} catch (skipErr) {
	// ...
}
```

## Pass

```js
try {
	doSomething();
} catch (ignoreErr) {
	// ...
}
```

