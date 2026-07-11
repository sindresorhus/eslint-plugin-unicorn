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

## Relationship to other rules

This rule checks control flow within Promise executors. It does not overlap with [`prefer-promise-with-resolvers`](./prefer-promise-with-resolvers.md), which replaces resolver extraction boilerplate, [`prefer-promise-try`](./prefer-promise-try.md), which replaces promise-wrapping boilerplate, or [`no-useless-promise-resolve-reject`](./no-useless-promise-resolve-reject.md), which checks redundant static `Promise.resolve()` and `Promise.reject()` calls.

Similar checks are available as [`promise/no-multiple-resolved`](https://github.com/eslint-community/eslint-plugin-promise/blob/main/docs/rules/no-multiple-resolved.md) and [DeepScan's `MULTIPLE_RESOLVE_IN_PROMISE_EXECUTOR`](https://deepscan.io/docs/rules/multiple-resolve-in-promise-executor/).

## Limitations

Only direct calls to simple identifier resolver parameters of an inline, non-generator executor passed as the sole argument to the bare global `Promise` constructor are checked. Resolver calls are correlated only within one ESLint code path. They are not correlated between an executor and a nested function, class field initializer, or static block; between sibling callbacks; or across repeated invocations of one callback. Aliases, `.call()` and `.apply()`, passed or escaped resolver functions, and reassigned resolver parameters are ignored.

Exception paths are tracked for calls, construction, property access, and explicit `throw` and `yield`. Rejection from `await` is additionally modeled when its operand is directly an identifier or dynamic import. Implicit exceptions from bare unresolved identifiers, operators, coercion, destructuring, or iteration are not modeled.

The rule follows ESLint's code-path graph and, except for falsy literal loop tests, does not evaluate condition values or correlate values across separate condition tests. For example, it cannot determine that independent `if (error)` and `if (!error)` branches are mutually exclusive. It also does not infer that resolver functions return `undefined` when their calls are used as conditions. Loop backedges associated with a `continue` crossing a `finally` block are ignored to avoid false positives when `finally` replaces the `continue` with `break`. This can miss duplicates when the `continue` remains effective or when `finally` replaces `break` with `continue`.
