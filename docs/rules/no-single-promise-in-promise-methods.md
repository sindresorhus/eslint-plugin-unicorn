# Disallow passing single-element arrays to `Promise` methods

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Passing a single-element array to `Promise.all()`, `Promise.any()`, or `Promise.race()` is likely a mistake.

## Examples

```js
// ❌
const foo = await Promise.all([promise]);

// ❌
const foo = await Promise.any([promise]);

// ❌
const foo = await Promise.race([promise]);

// ✅
const foo = await promise;
```

```js
// ❌
const promise = Promise.all([nonPromise]);

// ✅
const promise = Promise.resolve(nonPromise);
```

```js
// ✅
const foo = await Promise.all(promises);
```

```js
// ✅
const foo = await Promise.any([promise, anotherPromise]);
```

```js
// ✅
const [{value: foo, reason: error}] = await Promise.allSettled([promise]);
```
