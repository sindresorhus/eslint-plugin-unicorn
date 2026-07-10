# prefer-then-catch

📝 Prefer `.then().catch()` over `.then(…, …)` for error handling.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The second callback of `.then(onFulfilled, onRejected)` handles rejections from earlier in the chain, but not errors thrown or rejected by `onFulfilled`. Attach the rejection handler to the promise returned by `.then()` to handle both.

The change intentionally broadens the error boundary, so the rule provides an editor suggestion instead of an autofix. Use an inline disable when handling only the original promise rejection is intentional.

Unlike [`eslint-plugin-promise/prefer-catch`](https://github.com/eslint-community/eslint-plugin-promise/blob/main/docs/rules/prefer-catch.md), this rule does not preserve the original behavior with `.catch(onRejected).then(onFulfilled)`. It specifically places `.catch()` after `.then()` to catch errors from the fulfillment handler too.

## Examples

```js
// ❌
fetch(url).then(
	response => JSON.parse(response),
	error => {
		log(error);
	},
);

// ✅
fetch(url)
	.then(response => JSON.parse(response))
	.catch(error => {
		log(error);
	});
```

`Promise.prototype.then()` supports a second callback, so the rule deliberately leaves calls with a missing or nullish fulfillment or rejection callback alone.

```js
// ✅
promise.then(undefined, handleError);
promise.then(onFulfilled, undefined);
```

## Limitations

The rule only checks direct, non-optional `.then()` calls with exactly two arguments. Computed access, optional chaining, extra arguments, and calls whose TypeScript result type does not have a `.catch()` method are ignored. Without TypeScript type information, it uses the normal `.then()` method-name heuristic, so custom thenables are unsupported.

Suggestions are withheld when moving the rejection handler could remove or relocate comments.
