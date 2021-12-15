# Disallow duplicate literal elements in `Array`, `Set` or `Map` key

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

In the case of hardcoded definition of the  Array, Set or Map content, it may be difficult to confirm whether there are duplicate content or duplicate Map Key values due to the continuous increase of the content, which may result in the increase of duplicate content.

This rule will be reported when the contents of the hardcoded Array, Set or Map key literal elements is duplicated.

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
