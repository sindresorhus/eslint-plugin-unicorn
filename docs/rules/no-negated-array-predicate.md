# no-negated-array-predicate

📝 Disallow negated array predicate calls.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer swapping [`Array#some()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) and [`Array#every()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every) with a negated predicate instead of negating the whole call.

This applies De Morgan's laws in the small, focused case where the callback has a directly returned expression.

## Examples

```js
// ❌
const isMissing = !array.some(element => isUnicorn(element));

// ✅
const isMissing = array.every(element => !isUnicorn(element));
```

```js
// ❌
const isNotEveryUnicorn = !array.every(element => isUnicorn(element));

// ✅
const isNotEveryUnicorn = array.some(element => !isUnicorn(element));
```

```js
// ❌
if (!array.some(element => !isUnicorn(element))) {}

// ✅
if (array.every(element => isUnicorn(element))) {}
```

```js
// ✅
if (!array.every(Boolean)) {}
```
