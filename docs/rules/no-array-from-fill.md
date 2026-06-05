# no-array-from-fill

📝 Disallow `.fill()` after `Array.from({length: …})`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer the `Array.from(…, mapFunction)` argument when creating a fixed length array and immediately mapping over it.

Calling `.fill()` after `Array.from({length: …})` is usually redundant. For mapped arrays, `Array.from()` can create each value directly.

## Examples

```js
// ❌
Array.from({length: 3}).fill().map((_, index) => index);

// ✅
Array.from({length: 3}, (_, index) => index);
```

```js
// ❌
Array.from({length: 3}).fill().flatMap((_, index) => [index]);
```

```js
// ❌
Array.from({length: 3}).fill({});
```

```js
// ✅
Array.from({length: 3}, () => ({}));
```

```js
// ✅
Array.from({length: 3}, (_, index) => index);
```
