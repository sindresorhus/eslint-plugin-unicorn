# no-await-in-promise-methods

📝 Disallow using `await` in `Promise` method parameters.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using `await` on promises passed as arguments to `Promise.all()`, `Promise.allSettled()`, `Promise.any()`, or `Promise.race()` is likely a mistake.

This also applies to `await` nested inside an element, since it delays the evaluation of the elements after it.

## Examples

```js
// ❌
Promise.all([await promise, anotherPromise]);

// ✅
Promise.all([promise, anotherPromise]);
```

```js
// ❌
Promise.allSettled([await promise, anotherPromise]);

// ✅
Promise.allSettled([promise, anotherPromise]);
```

```js
// ❌
Promise.any([await promise, anotherPromise]);

// ✅
Promise.any([promise, anotherPromise]);
```

```js
// ❌
Promise.race([await promise, anotherPromise]);

// ✅
Promise.race([promise, anotherPromise]);
```

```js
// ❌
Promise.all([(await promise).foo, anotherPromise]);

// ✅
Promise.all([promise.then(value => value.foo), anotherPromise]);
```

```js
// ❌
Promise.all([condition ? await promise : fallbackPromise, anotherPromise]);

// ✅
Promise.all([condition ? promise : fallbackPromise, anotherPromise]);
```
