# no-async-iterator-callback

📝 Disallow asynchronous callbacks in synchronous iterator helpers.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Synchronous iterator helpers do not await callback results:

- `filter`, `some`, `every`, and `find` treat returned promises as truthy, regardless of their resolved values.
- `forEach` discards returned promises and does not wait for asynchronous callbacks to finish.
- `flatMap` requires a synchronous iterable or iterator. Returning a promise causes a `TypeError` when the helper is consumed.

This rule disallows asynchronous callbacks for these six methods. Awaiting the helper call does not make it await its callbacks.

## Examples

```js
// ❌
Iterator.from(values).filter(async value => isAllowed(value));

Iterator.from(values).some(async value => isAllowed(value));

Iterator.from(values).every(async value => isAllowed(value));

Iterator.from(values).find(async value => isAllowed(value));

Iterator.from(values).forEach(async value => {
	await save(value);
});

Iterator.from(values).flatMap(async value => getChildren(value));

// ✅
Iterator.from(values).filter(value => value.isAllowed);

for (const value of values) {
	await save(value);
}

const allowedValues = [];
for (const value of values) {
	if (await isAllowed(value)) {
		allowedValues.push(value);
	}
}
```

`map` and `reduce` are allowed because producing promises or accumulating a promise can be intentional:

```js
const results = await Promise.all(
	Iterator.from(values).map(async value => transform(value))
);

const total = await Iterator.from(values).reduce(
	async (sum, value) => (await sum) + (await getAmount(value)),
	0
);
```

## Detection

The rule checks recognized synchronous iterators, including `Iterator.from(…)`, collection iterator methods, `matchAll(…)`, helper chains, direct `const` bindings, and known TypeScript iterator types. Receiver detection is best-effort; arrays, async iterators, and unknown receivers are ignored.

Without type information, it detects inline async functions, direct `const` bindings to async functions, and unreassigned local async function declarations. This syntax-only analysis does not follow arbitrary aliases or inspect callback bodies. With [TypeScript type information](https://typescript-eslint.io/getting-started/typed-linting/), it also detects callbacks whose return types include `Promise` or `PromiseLike`, including imported functions and object methods. Async generator callbacks are ignored.

The rule does not provide fixes or suggestions because choosing sequential or concurrent execution requires understanding the intended behavior.
