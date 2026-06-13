# no-useless-spread

📝 Disallow unnecessary spread.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

- Using spread syntax in the following cases is unnecessary:

  - Spread an array literal as elements of an array literal
  - Spread an array literal as arguments of a call or a `new` call
  - Spread an object literal as properties of an object literal
  - Use an object literal with only spread properties as an `Object.assign(…)` source argument
  - Spread an iterable as the only argument to a collection constructor that accepts a single iterable argument
  - Use spread syntax to clone an array created inline

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

- `for…of` loop can iterate over any iterable object not just arrays, so it's unnecessary to convert the iterable to an array.

- `yield*` can delegate to another iterable, so it's unnecessary to convert the iterable to an array.

## Examples

```js
// ❌
const array = [firstElement, ...[secondElement], thirdElement];

// ✅
const array = [firstElement, secondElement, thirdElement];
```

```js
// ❌
const object = {firstProperty, ...{secondProperty}, thirdProperty};

// ✅
const object = {firstProperty, secondProperty, thirdProperty};
```

```js
// ❌
foo(firstArgument, ...[secondArgument], thirdArgument);

// ✅
foo(firstArgument, secondArgument, thirdArgument);
```

```js
// ❌
const object = new Foo(firstArgument, ...[secondArgument], thirdArgument);

// ✅
const object = new Foo(firstArgument, secondArgument, thirdArgument);
```

```js
// ❌
Object.assign(target, {...source});

// 💡
Object.assign(target, source);
```

The `Object.assign(target, {...source})` case is intentionally suggested instead of autofixed because replacing the temporary object can change observable getter and setter timing.

```js
// ❌
const set = new Set([...iterable]);

// ✅
const set = new Set(iterable);
```

```js
// ❌
const set = new Set(...iterable);
```

The `new Set(...iterable)`, `new Map(...iterable)`, `new WeakSet(...iterable)`, and `new WeakMap(...iterable)` cases are intentionally not autofixed because the correct replacement depends on the iterable value. Pass the intended single iterable argument directly.

```js
// ❌
const results = await Promise.all([...iterable]);

// ✅
const results = await Promise.all(iterable);
```

```js
// ❌
for (const foo of [...set]);

// ✅
for (const foo of set);
```

```js
// ❌
function * foo() {
	yield * [...anotherGenerator()];
}

// ✅
function * foo() {
	yield * anotherGenerator();
}
```

```js
// ✅
const array = [...foo, bar];
```

```js
// ✅
const object = {...foo, bar};
```

```js
// ✅
foo(foo, ...bar);
```

```js
// ✅
const object = new Foo(...foo, bar);
```

## Sparse arrays

This rule assumes dense arrays. Sparse arrays are unsupported: array spread turns empty slots into `undefined`, while methods like `Array#concat()` preserve them. Disable this rule where sparse arrays are intentional.
