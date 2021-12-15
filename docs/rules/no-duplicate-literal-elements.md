# Hardcoded `Set` and `Map` of literals and consts with duplicates

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

Sometimes a hardcoded Set grows large enough for it to be hard to see if there is already a value in it. One could miss that a value one wants to add is already there and add a duplicate.

This rule report hardcoded `Set` and `Map` of literals and consts with duplicates.

## Fail

```js
const foo = new Set([1, 2, 1]);
const foo = new Set([1, null, null]);
const foo = new Set(['1', '2', '1']);
const foo = new Map([['a', 1], ['a', 2]]);
```

## Pass

```js
const foo = new Set([1, 2, 3]);
const foo = new Set([1, 2, '1']);
const foo = new Set([{}, {}, [], []]);
const foo = new Map([['a', 1], ['b', 2]]);
```

```js
const array = [1, 2, 1]
const foo = new Set(array)
```

```js
const obj = { a: 1, a: 2 }
const map = new Map(Object.entries(obj))
```
