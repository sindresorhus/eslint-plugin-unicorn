# Disallow unnecessary spread

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

- Using spread syntax in the following cases is unnecessary:

  - Spread an array literal as elements of an array literal
  - Spread an array literal as arguments of a call or a `new` call
  - Spread an object literal as properties of an object literal
  - Use spread syntax to clone an immediate array

- The following builtins accept an iterable, so it's unnecessary to convert the iterable to an array:

  - `Map` constructor
  - `WeakMap` constructor
  - `Set` constructor
  - `WeakSet` constructor
  - `TypedArray` constructor
  - `Array.from(…)`
  - `TypedArray.from(…)`
  - `Promise.{all,allSettled,any,race}(…)`
  - `Object.fromEntries(…)`

- `for…of` loop can iterate over any iterable object not just array, so it's unnecessary to convert the iterable to an array.

- `yield*` can delegate to another iterable, so it's unnecessary to convert the iterable to an array.

## Fail

```js
const array = [firstElement, ...[secondElement], thirdElement];
```

```js
const object = {firstProperty, ...{secondProperty}, thirdProperty};
```

```js
foo(firstArgument, ...[secondArgument], thirdArgument);
```

```js
const object = new Foo(firstArgument, ...[secondArgument], thirdArgument);
```

```js
const set = new Set([...iterable]);
```

```js
const results = await Promise.all([...iterable]);
```

```js
for (const foo of [...set]);
```

```js
function * foo() {
	yield * [...anotherGenerator()];
}
```

```js
function foo(bar) {
	return [
		...bar.map(x => x * 2),
	];
}
```

## Pass

```js
const array = [firstElement, secondElement, thirdElement];
```

```js
const object = {firstProperty, secondProperty, thirdProperty};
```

```js
foo(firstArgument, secondArgument, thirdArgument);
```

```js
const object = new Foo(firstArgument, secondArgument, thirdArgument);
```

```js
const array = [...foo, bar];
```

```js
const object = {...foo, bar};
```

```js
foo(foo, ...bar);
```

```js
const object = new Foo(...foo, bar);
```

```js
const set = new Set(iterable);
```

```js
const results = await Promise.all(iterable);
```

```js
for (const foo of set);
```

```js
function * foo() {
	yield * anotherGenerator();
}
```

```js
function foo(bar) {
	return bar.map(x => x * 2);
}
```
