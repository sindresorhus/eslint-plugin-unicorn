# Disallow using `await` in `Promise` method parameters

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Awaited parameters in a Promise.all(), Promise.allSettled(), Promise.any() or Promise.race() method is probably a mistake.

## Fail

```js
Promise.all([promise, await promise, await promise, promise])

Promise.allSettled([promise, await promise, await promise, promise])

Promise.any([promise, await promise, await promise, promise])

Promise.race([promise, await promise, await promise, promise])
```

## Pass

```js
Promise.all([promise, promise, promise, promise])

Promise.allSettled([promise, promise, promise, promise])

Promise.any([promise, promise, promise, promise])

Promise.race([promise, promise, promise, promise])

Promise.resolve([await promise])
```
