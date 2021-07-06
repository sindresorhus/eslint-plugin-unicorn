# Prefer the spread operator over `Array.from(…)`, `Array#concat(…)` and `Array#slice()`

Enforces the use of [the spread operator (`...`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) over

- `Array.from(…)`

	Convert `Iterable` to `Array`.

	This rule adds on to the built-in [prefer-spread](https://eslint.org/docs/rules/prefer-spread) rule, which only flags uses of `.apply()`. Does not enforce for `TypedArray.from()`.

- `Array#concat(…)`

	Concat an `Array` with one or more `Array`'s or `Array` elements.

- `Array#slice()`

	Shallow copy an `Array`.

	Variables named `arrayBuffer`, `blob`, `buffer`, `file`, and `this` are ignored.

This rule is partly fixable.

## Fail

```js
Array.from(set).map(element => foo(element));
```

```js
const array = array1.concat(array2);
```

```js
const copy = array.slice();
```

## Pass

```js
[...set].map(element => foo(element));
```

```js
const array = [...array1, ...array2];
```

```js
const tail = array.slice(1);
```

```js
const copy = [...array];
```

## Work together with `unicorn/no-useless-spread` rule

Some cases are fixed with extra spread syntax, suggest enable [`unicorn/no-useless-spread`](./no-useless-spread.md) rule to fix it.

For example:

```js
const baz = [2];
call(foo, ...[bar].concat(baz));
```

will fix to

```js
const baz = [2];
call(foo, ...[bar, ...baz]);
```

After `unicorn/no-useless-spread` auto fix,

it will fix to correct code

```js
const baz = [2];
call(foo, bar, ...baz);
```

