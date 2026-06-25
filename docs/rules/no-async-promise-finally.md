# no-async-promise-finally

📝 Disallow async functions as `Promise#finally()` callbacks.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Passing an async function to `Promise#finally()` can hide the original promise outcome. If the promise rejects and the async finalizer also rejects, the resulting promise rejects with the finalizer error instead of the original error.

This rule reports async finalizer callbacks that are directly passed to `.finally()` or referenced through a local function declaration or `const` variable.

## Examples

```js
// ❌
promise.finally(async () => {
	await cleanup();
});

// ✅
promise.finally(() => {
	cleanup();
});
```

```js
// ❌
async function cleanup() {}

promise.finally(cleanup);

// ✅
function cleanup() {}

promise.finally(cleanup);
```

If cleanup must be asynchronous, handle its errors explicitly so they do not replace the original rejection:

```js
// ✅
promise.finally(() => {
	return cleanup().catch(error => {
		logCleanupError(error);
	});
});
```

The behavior can be seen with this example:

```js
const original = new Error('original');
const cleanup = new Error('cleanup');

try {
	await Promise.reject(original).finally(async () => {
		await Promise.reject(cleanup);
	});
} catch (error) {
	console.log(error.message);
	//=> 'cleanup'
}
```

## Limitations

This rule only reports callbacks it can locally identify as async. Imported functions, member expressions, and other dynamic callback references are ignored.
