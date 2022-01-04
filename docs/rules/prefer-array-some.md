# Prefer `.some(…)` over `.filter(…).length` check and `.find(…)`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

Prefer using [`Array#some`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) over:

- Non-zero length check on the result of [`Array#filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).

We only check `.filter().length > 0` and `.filter().length !== 0`. These two non-zero length check styles are allowed in [`unicorn/explicit-length-check`](./explicit-length-check.md#options) rule. It is recommended to use them together.

- Using [`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) to ensure at least one element in the array passes a given check.

- Comparing the result of [`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) with `undefined`.

This rule is fixable for `.filter(…).length` check and has a suggestion for `.find(…)`.

## Fail

```js
const hasUnicorn = array.filter(element => isUnicorn(element)).length > 0;
```

```js
const hasUnicorn = array.filter(element => isUnicorn(element)).length !== 0;
```

```js
const hasUnicorn = array.filter(element => isUnicorn(element)).length >= 1;
```

```js
if (array.find(element => isUnicorn(element))) {
	// …
}
```

```js
const foo = array.find(element => isUnicorn(element)) ? bar : baz;
```

```js
const hasUnicorn = array.find(element => isUnicorn(element) !== undefined;
```

```js
const hasUnicorn = array.find(element => isUnicorn(element) != null;
```

```vue
<template>
	<div v-if="array.find(element => isUnicorn(element))">Vue</div>
</template>
```

```vue
<template>
	<div v-if="array.filter(element => isUnicorn(element)).length > 0">Vue</div>
</template>
```

## Pass

```js
const hasUnicorn = array.some(element => isUnicorn(element));
```

```js
if (array.some(element => isUnicorn(element))) {
	// …
}
```

```js
const foo = array.find(element => isUnicorn(element)) || bar;
```

```vue
<template>
	<div v-if="array.some(element => isUnicorn(element))">Vue</div>
</template>
```
