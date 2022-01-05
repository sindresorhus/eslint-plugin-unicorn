# Prefer the spread operator over `Array.from(…)`, `Array#concat(…)`, `Array#slice()` and `String#split('')`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

Enforces the use of [the spread operator (`...`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) over

- `Array.from(…)`

	Convert `Iterable` to `Array`.

	This rule adds on to the built-in [prefer-spread](https://eslint.org/docs/rules/prefer-spread) rule, which only flags uses of `.apply()`. Does not enforce for `TypedArray.from()`.

- `Array#concat(…)`

	Concat an `Array` with one or more `Array`'s or `Array` elements.

- `Array#slice()`

	Shallow copy an `Array`.

	Variables named `arrayBuffer`, `blob`, `buffer`, `file`, and `this` are ignored.

- `String#split('')`

	Split a string into an array of characters.

	Note: [The suggestion fix may get different result](https://stackoverflow.com/questions/4547609/how-to-get-character-array-from-a-string/34717402#34717402).

To enforce the spread operator over `Object#assign()`, use the built-in [`prefer-object-spread` rule](https://eslint.org/docs/rules/prefer-object-spread).

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

```js
const characters = string.split('');
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

```js
const characters = [...string];
```

## With the `unicorn/no-useless-spread` rule

Some cases are fixed using extra spread syntax. Therefore we recommend enabling the [`unicorn/no-useless-spread`](./no-useless-spread.md) rule to fix it.

For example:

```js
const baz = [2];
call(foo, ...[bar].concat(baz));
```

Will be fixed to:

```js
const baz = [2];
call(foo, ...[bar, ...baz]);
```

`unicorn/no-useless-spread` will fix it to:

```js
const baz = [2];
call(foo, bar, ...baz);
```
