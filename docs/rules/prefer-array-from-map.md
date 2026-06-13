# prefer-array-from-map

📝 Prefer using the `Array.from()` mapping function argument.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer passing the mapping function directly to `Array.from()` instead of calling `.map()` on the created array.

`Array.from(iterable, mapFunction)` avoids creating an intermediate array before mapping.

This rule only reports inline arrow function callbacks that do not use `Array#map`'s third callback argument.

## Examples

```js
// ❌
const foo = Array.from(bar).map(element => element.id);

// ✅
const foo = Array.from(bar, element => element.id);
```

```js
// ❌
const foo = Array.from(bar).map((element, index) => `${index}:${element}`);

// ✅
const foo = Array.from(bar, (element, index) => `${index}:${element}`);
```

```js
// ✅
const foo = Array.from(bar).map((element, index, array) => {
	return array.includes(element);
});
```
