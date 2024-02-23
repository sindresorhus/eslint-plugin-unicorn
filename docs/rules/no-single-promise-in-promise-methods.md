# Disallow passing single-element arrays to `Promise` methods

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Passing a single-element array to `Promise.all()`, `Promise.any()`, or `Promise.race()` is likely a mistake.

## Fail

```js
const foo = await Promise.all([promise]);
```

```js
const foo = await Promise.any([promise]);
```

```js
const foo = await Promise.race([promise]);
```

## Pass

```js
const foo = await Promise.all([promise, anotherPromise]);
```

```js
const foo = await Promise.all(notArrayLiteral);
```

```js
const foo = await Promise.all([...promises]);
```

```js
const foo = await Promise.any([promise, anotherPromise]);
```

```js
const foo = await Promise.race([promise, anotherPromise]);
```

```js
const [{value: foo, reason: error}] = await Promise.allSettled([promise]);
```

```js
const foo = await Promise.resolve(promise);
```
