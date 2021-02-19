# Prefer the spread operator over `Array.from(…)`, `Array#concat(…)` and `Array#slice()`

Enforces the use of [the spread operator (`...`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) over

- `Array.from(…)`

	Convert `iterable` to `array`.

	This rule adds on to the built-in [prefer-spread](https://eslint.org/docs/rules/prefer-spread) rule, which only flags uses of `.apply()`. Does not enforce for `TypedArray.from()`.

- `Array#concat(…)`

	Concat `array` with element(s) or `array`(s).

- `Array#slice()`

	Shallow copy an `array`.

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
const copy = [...array];
```
