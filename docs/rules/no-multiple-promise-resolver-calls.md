# no-multiple-promise-resolver-calls

📝 Disallow calling Promise executor resolver functions more than once on the same execution path.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The `resolve` and `reject` functions passed to a Promise executor share a single-use state. After either function is called, later calls cannot change the promise's eventual outcome. This is often caused by a missing `return` or by branches that should be mutually exclusive.

[Resolving with a pending promise or thenable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve#description) does not immediately settle the new promise, but it still prevents later calls to either resolver function from changing the outcome.

This rule uses code-path analysis to report a resolver call when an earlier `resolve` or `reject` call can reach it. It also reports resolver calls in loops that may execute more than once.

## Examples

```js
// ❌
new Promise((resolve, reject) => {
	if (error) {
		reject(error);
	}

	resolve(value);
});
```

```js
// ✅
new Promise((resolve, reject) => {
	if (error) {
		reject(error);
		return;
	}

	resolve(value);
});
```

Mutually exclusive resolver calls are allowed.

```js
// ✅
new Promise((resolve, reject) => {
	if (error) {
		reject(error);
	} else {
		resolve(value);
	}
});
```

Exceptions thrown while evaluating a value passed to `resolve` happen before the resolver is called, so this common pattern is allowed.

```js
// ✅
new Promise((resolve, reject) => {
	try {
		resolve(mayThrow());
	} catch (error) {
		reject(error);
	}
});
```

Code that may throw after resolving can reach the rejection handler after the promise outcome is already fixed, so it is reported.

```js
// ❌
new Promise((resolve, reject) => {
	try {
		resolve(value);
		mayThrow();
	} catch (error) {
		reject(error);
	}
});
```

## Limitations

Only direct calls to the first two identifier parameters of an inline, non-generator executor passed as the only argument to bare global `new Promise()` are checked. Aliased, reassigned, indirect, or escaped calls, separate code paths, implicit exceptions, correlated conditions, and some `finally` loop edges are not modeled.
