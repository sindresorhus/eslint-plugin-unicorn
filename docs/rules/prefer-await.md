# prefer-await

📝 Prefer `await` over promise chaining.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using `await` makes asynchronous control flow read like synchronous code and avoids nesting callback chains.

This rule reports promise chaining with `.then()`, `.catch()`, and `.finally()`. Type-aware receiver checks also report promise-like thenables, since `await` assimilates them. When TypeScript type information is available, receivers known not to be promises are ignored. Without type information, the rule falls back to method-name heuristics.

Chains explicitly discarded with the `void` operator are ignored, since `void` is the idiomatic way to opt out of awaiting an intentional fire-and-forget promise.

This rule intentionally has no options. Use an inline disable for library-specific chains that should remain callback-based.

## Examples

```js
// ❌
promise.then(value => {
	return transform(value);
});

// ✅
const value = await promise;
return transform(value);

// ✅ Wrap in an async block if you don't want to await it
(async () => {
	const value = await promise;
	alert(value);
})();
```
```js
// ❌
promise.catch(error => {
	handleError(error);
});

// ✅
try {
	await promise;
} catch (error) {
	handleError(error);
}
```
```js
// ✅
// Intentional fire-and-forget, opted out with `void`.
void promise.catch(() => {});

// ❌
promise.finally(cleanup);
```
```js
// ✅
try {
	await promise;
} finally {
	cleanup();
}
```

## Comparison with `eslint-plugin-promise/prefer-await-to-then`

This rule is intentionally stricter. It reports promise chains in places where `eslint-plugin-promise/prefer-await-to-then` allows them by default, including chains whose result is awaited or yielded, chains in constructors, and untyped Cypress-style chains.

It also uses TypeScript type information when available. Known non-promise receivers are ignored, while promise-like thenables are still reported because `await` assimilates them. Without type information, it falls back to simple method-name heuristics, so JavaScript projects still get useful coverage.
