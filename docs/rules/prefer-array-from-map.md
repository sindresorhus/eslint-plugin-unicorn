# prefer-array-from-map

📝 Prefer using the `Array.from()` mapping function argument.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer passing the mapping function directly to `Array.from()` instead of calling `.map()` on the created array or filling an empty array in a `for…of` loop.

`Array.from(iterable, mapFunction)` avoids creating an intermediate array before mapping.

When checking `.map()` calls, this rule only reports inline arrow function callbacks that do not use `Array#map`'s third callback argument.

When checking `for…of` loops, this rule only reports adjacent empty-array declarations followed by a simple loop body that adds exactly one mapped value. Trivial copies are handled by [`prefer-spread`](./prefer-spread.md).

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
// ❌
const foo = [];
for (const element of bar) {
	foo.push(element.id);
}

// ✅
const foo = Array.from(bar, element => element.id);
```

```js
// ❌
const foo = [];
for (const [index, element] of bar.entries()) {
	foo.push(`${index}:${element}`);
}

// ✅
const foo = Array.from(bar.entries(), ([index, element]) => `${index}:${element}`);
```

```js
// ✅
const foo = Array.from(bar).map((element, index, array) => {
	return array.includes(element);
});
```

```js
// ✅
const foo = [];
for (const element of bar) {
	foo.push(element);
}
```
