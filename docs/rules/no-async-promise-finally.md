# no-async-promise-finally

📝 Disallow async functions as `Promise#finally()` callbacks.

🚫 Disabled by default.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Promise#finally()` waits for async callbacks. This opt-in rule flags them because cleanup errors can replace an earlier failure; it enforces a syntax convention rather than verifying cleanup safety.

## Examples

```js
// ❌
promise.finally(async () => {
	await cleanup();
});

// ✅
promise.finally(() => {
	cleanupSynchronously();
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

## Cleanup errors

If both operations fail, the cleanup error replaces the original error:

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

Failed flushes or closes may need to reject the operation. Suppress cleanup failures only when they can be ignored even after successful work:

```js
// ✅
promise.finally(() => {
	return cleanup().catch(error => {
		logCleanupError(error);
	});
});
```

## When not to use it

Leave disabled when async cleanup is intentional. It reports async callbacks even when they handle cleanup errors, while returning the same promise from a non-async callback passes without changing cleanup waiting or error propagation.

## Limitations

Detection is limited to inline async functions and direct, unreassigned local references. Imports, properties, aliases, non-async callbacks, and `await` in `finally` blocks are ignored. Without type information, `.finally()` is assumed to be a promise method.
