# Disallow using `Promise` method with a single element array as parameter

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Single element array parameter in a Promise.all(), Promise.any() or Promise.race() method is probably a mistake.

## Fail

```js
Promise.all([promise])

Promise.any([promise])

Promise.race([promise])
```

## Pass

```js
Promise.all([promise, anotherPromise])
Promise.all(notArrayLiteral)
Promise.all([...promises])

Promise.any([promise, anotherPromise])

Promise.race([promise, anotherPromise])

Promise.allSettled([promise])
```
