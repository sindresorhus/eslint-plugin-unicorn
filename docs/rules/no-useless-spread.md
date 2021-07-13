# Disallow useless spread

- Using spread syntax in the following cases is unnecessary:

	- Spread an array literal as elements of an array literal
	- Spread an array literal as arguments of a call or a `new` call
	- Spread an object literal as properties of an object literal

- Builtins `new {Map,WeakMap,Set,WeakSet}(…)`, `Promise.{all,race,allSettled}(…)`, and `Array.from(…)` accepts iterable as argument, it's unnecessary to convert iterable to an array.

- `for…of` loop can iterate over any iterable object not just array, it's unnecessary to convert iterable to an array.

This rule is fixable.

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
