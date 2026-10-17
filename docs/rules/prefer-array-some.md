# prefer-array-some

📝 Prefer `.some(…)` over `.filter(…).length` check and `.{find,findLast,findIndex,findLastIndex}(…)`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#some` directly expresses an existence check, making it clearer than inspecting a result or found value.

Prefer using [`Array#some`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) over:

- Non-zero length check on the result of [`Array#filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).

We only check `.filter().length > 0` and `.filter().length !== 0`. These two non-zero length check styles are allowed in [`unicorn/explicit-length-check`](./explicit-length-check.md#options) rule. It is recommended to use them together.

- Using [`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) or [`Array#findLast()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast) to ensure at least one element in the array passes a given check.

- Comparing the result of [`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) or [`Array#findLast()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast) with `undefined`.

- Using [`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) or [`Array#findLastIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLastIndex) to ensure at least one element in the array passes a given check.

Replacements for `.find()` and `.findLast()` are suggestions because a matching element can be falsy. Replacing `.findLast()` also changes the iteration order.

`.findIndex()` checks are autofixed. `.findLastIndex()` and `.filter().length` checks are autofixed when the callback is an inline function without side effects; otherwise, a suggestion is offered. These replacements can change how many times the callback runs or its iteration order.

This rule skips receivers known to be neither an array nor a typed array, from syntax, TypeScript annotations, or TypeScript type information. Unknown receivers are still checked.

The rule also checks `.find()` and `.findLast()` results assigned to an unannotated `const` variable when every use passes the variable directly to the global `Boolean()` function. Other boolean contexts are supported when the receiver is known to be an array or typed array.

## Examples

```js
// ❌
const hasUnicorn = array.filter(element => isUnicorn(element)).length > 0;

// ❌
const hasUnicorn = array.filter(element => isUnicorn(element)).length !== 0;

// ❌
const hasUnicorn = array.find(element => isUnicorn(element)) !== undefined;

// ❌
const hasUnicorn = array.find(element => isUnicorn(element)) != null;

// ✅
const hasUnicorn = array.some(element => isUnicorn(element));
```

```js
// ❌
if (array.find(element => isUnicorn(element))) {
	// …
}

// ✅
if (array.some(element => isUnicorn(element))) {
	// …
}
```

```js
// ❌
function hasBigItem(array) {
	const found = array.find(item => item > 2);
	return Boolean(found);
}

// ✅
function hasBigItem(array) {
	const found = array.some(item => item > 2);
	return Boolean(found);
}
```

```js
// ❌
const foo = unicorns.find(unicorn => unicorn.isRainbow) ? bar : baz;
```

```js
// ✅
const foo = unicorns.some(unicorn => unicorn.isRainbow) ? bar : baz;
```

```js
// ❌
const hasUnicorn = array.findLast(element => isUnicorn(element)) !== undefined;
```

```js
// ✅
const hasUnicorn = array.some(element => isUnicorn(element));
```

```js
// ❌
const hasUnicorn = array.findLast(element => isUnicorn(element)) != null;
```

```js
// ✅
const hasUnicorn = array.some(element => isUnicorn(element));
```

```js
// ❌
const hasUnicorn = array.findIndex(element => isUnicorn(element)) !== -1;
```

```js
// ✅
const hasUnicorn = array.some(element => isUnicorn(element));
```

```js
// ❌
const hasUnicorn = array.findLastIndex(element => isUnicorn(element)) !== -1;
```

```js
// ✅
const hasUnicorn = array.some(element => isUnicorn(element));
```

```js
// ❌
const foo = unicorns.findLast(unicorn => unicorn.isRainbow) ? bar : baz;
```

```js
// ✅
const foo = unicorns.some(unicorn => unicorn.isRainbow) ? bar : baz;
```

```vue
<template>
	<!-- ❌ -->
	<div v-if="array.find(element => isUnicorn(element))">Vue</div>

	<!-- ❌ -->
	<div v-if="array.filter(element => isUnicorn(element)).length > 0">Vue</div>

	<!-- ✅ -->
	<div v-if="array.some(element => isUnicorn(element))">Vue</div>
</template>
```

```vue
<template>
	<!-- ❌ -->
	<div v-if="array.findLast(element => isUnicorn(element))">Vue</div>

	<!-- ✅ -->
	<div v-if="array.some(element => isUnicorn(element))">Vue</div>
</template>
```
