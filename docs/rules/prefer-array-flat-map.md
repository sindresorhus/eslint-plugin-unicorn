# prefer-array-flat-map

📝 Prefer `.flatMap(…)` over `.map(…).flat()` and `.filter(…).flatMap(…)`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Array#flatMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) performs [`Array#map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [`Array#flat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) in one step.

It expresses mapping and flattening directly and avoids intermediate arrays created by separate `map()` or `filter()` calls.

It can also add or remove items during mapping by returning an empty array for items that should be skipped. This rule only reports `.filter().flatMap()` when the `.flatMap()` callback can return multiple items. Single-item callbacks are handled by [`unicorn/no-unnecessary-array-flat-map`](./no-unnecessary-array-flat-map.md).

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
	.flatMap(element => [element.name, element.alias]);

// ✅
const foo = bar.flatMap(element => element.isUnicorn ? [element.name, element.alias] : []);
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
- [unicorn/no-unnecessary-array-flat-map](./no-unnecessary-array-flat-map.md)
