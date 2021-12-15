# Disallow duplicate literal elements in `Array`, `Set` or `Map` key

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

It is hard to know if there is duplicate in hardcoded value when `Array`, `Set`, or `Map` key grows larger.

This rule disallows duplicate in hardcoded values of `Array`, `Set` or `Map` key.

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
