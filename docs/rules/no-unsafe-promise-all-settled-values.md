# no-unsafe-promise-all-settled-values

📝 Disallow reading `.value` from `Promise.allSettled()` results without a fulfilled status guard.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Promise.allSettled()` returns both fulfilled and rejected result objects. Only fulfilled results have a `.value` property. Reading `.value` without first checking `status === 'fulfilled'` turns rejected results into `undefined`, which can silently drop failures.

This rule reports direct `.map()` extraction from known `Promise.allSettled()` result arrays, including simple `const` aliases. It intentionally keeps a narrow inference boundary: arbitrary aliasing, mutable `let` tracking, custom guard functions without type information, and broad non-`.map()` dataflow are out of scope.

With TypeScript type information, typed predicate filters that narrow entries to `PromiseFulfilledResult<T>` are treated as safe.

## Examples

```js
// ❌
const values = (await Promise.allSettled(promises)).map(result => result.value);

// ✅
const values = (await Promise.allSettled(promises))
	.filter(result => result.status === 'fulfilled')
	.map(result => result.value);
```

```js
// ❌
const values = Promise.allSettled(promises).then(results => results.map(result => result.value));

// ✅
const values = Promise.allSettled(promises).then(results =>
	results.map(result => result.status === 'fulfilled' ? result.value : undefined)
);
```

```ts
// ✅
const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> => result.status === 'fulfilled';
const values = results.filter(isFulfilled).map(result => result.value);
```
