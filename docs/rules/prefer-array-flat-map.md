# Prefer `.flatMap(…)` over `.map(…).flat()`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Array#flatMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) performs [`Array#map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [`Array#flat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) in one step.

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
