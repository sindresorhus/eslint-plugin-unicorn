# Disallow duplicate literal elements in `Array`, `Set` or `Map` key

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

It is hard to know if there is duplicate in hardcoded value when `Array`, `Set`, or `Map` key grows larger.

This rule disallows duplicate in hardcoded values of `Array`, `Set` or `Map` key.

## Fail

```js
const array = [1, 2, 1]
```

```js
const array = [false, true, false]
```

```js
const array = ['a', 'b', 'a']
```

```js
const array = ['a', 'b', 'a', 1, 2, 3, 1]
```

```js
[1, 2, 1]
```

```js
[false, true, false]
```

```js
['a', 'b', 'a', 1, 2, 3, 1]
```

```js
[1, null, null]
```

```js
const set = new Set([1, 2, 1])
```

```js
new Set([1, 2, 1])
```

```js
const set = new Set([1, null, null])
```

```js
const set = new Set(['1', '2', '1'])
```

```js
const set = new Set([1, '1', '1'])
```

```js
const set = new Set([false, true, false])
```

```js
const map = new Map([['a', 1], ['a', 2]])
```

```js
new Map([[1, 1], [2, 2], [1, 1]])
```

```js
new Map([[null, 1], [null, 1]])
```

```js
let array
array = [1, 2, 1]
```

## Pass

```js
const array = [1, 2, 3]
```

```js
const array = [1, '1']
```

```js
[1, 2, 3]
```

```js
const set = new Set([1, 2, 3])
```

```js
const set = new Set([1, 2, '1'])
```

```js
const set = new Set([{}, {}, [], []])
```

```js
const set = new Set([1, '1'])
```

```js
const map = new Map([['a', 1], ['b', 2]])
```

```js
const map = new Map([['a', 1], ['b', 2]])
```

```js
const map = new Map([])
```

```js
const map = new Map([[], []])
```

```js
let array
array = [1, 2, 3]
```

```js
const array = [1, 2]
array.push(1)
const set = new Set(array)
```

```js
const obj = { a: 1, a: 2 }
const map = new Map(Object.entries(obj))
```

```js
const array = [[1, 1], [2, 2], [1, 1]]
const map = new Map(Object.entries(obj))
```
