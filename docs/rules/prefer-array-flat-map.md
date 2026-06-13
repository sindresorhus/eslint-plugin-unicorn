# prefer-array-flat-map

📝 Prefer `.flatMap(…)` over `.map(…).flat()` and `.filter(…).flatMap(…)`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Array#flatMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) performs [`Array#map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [`Array#flat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) in one step.

It can also add or remove items during mapping by returning an empty array for items that should be skipped. This avoids an intermediate array from `.filter().flatMap()`.

## Examples

```js
// ❌
const foo = bar.map(element => unicorn(element)).flat();

// ❌
const foo = bar.map(element => unicorn(element)).flat(1);

// ✅
const foo = bar.flatMap(element => unicorn(element));
```

```js
// ❌
const foo = bar
	.filter(element => element.isUnicorn)
	.flatMap(element => unicorn(element));

// ✅
const foo = bar.flatMap(element => element.isUnicorn ? unicorn(element) : []);
```

```js
// ✅
const foo = bar.map(element => unicorn(element)).flat(2);
```

```js
// ✅
const foo = bar.map(element => unicorn(element)).foo().flat();
```

```js
// ✅
const foo = bar.flat().map(element => unicorn(element));
```

## Related rules

- [unicorn/prefer-array-flat](./prefer-array-flat.md)
