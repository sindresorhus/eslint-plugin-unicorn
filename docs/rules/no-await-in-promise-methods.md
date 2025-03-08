# Disallow using `await` in `Promise` method parameters

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using `await` on promises passed as arguments to `Promise.all()`, `Promise.allSettled()`, `Promise.any()`, or `Promise.race()` is likely a mistake.

## Fail

```js
Promise.all([await promise, anotherPromise]);

Promise.allSettled([await promise, anotherPromise]);

Promise.any([await promise, anotherPromise]);

Promise.race([await promise, anotherPromise]);
```

## Pass

```js
Promise.all([promise, anotherPromise]);

Promise.allSettled([promise, anotherPromise]);

Promise.any([promise, anotherPromise]);

Promise.race([promise, anotherPromise]);
```
