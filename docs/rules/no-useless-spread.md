# Disallow unnecessary spread

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

- Using spread syntax in the following cases is unnecessary:

	- Spread an array literal as elements of an array literal
	- Spread an array literal as arguments of a call or a `new` call
	- Spread an object literal as properties of an object literal

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
