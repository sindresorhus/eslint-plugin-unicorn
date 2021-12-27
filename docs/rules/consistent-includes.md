# Use `.includes()`, rather than repeated conditional logical OR (`||`) operators

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

<!-- More detailed description. Remove this comment. -->

## Fail

```js
foo === 1 || foo === 'string' || foo === true
```

## Pass

```js
[1, 'string', true].includes(foo)
```

## Fail

```js
foo !== 1 || foo !== 'string' || foo !== true
```

## Pass

```js
![1, 'string', true].includes(foo)
```

## Fail

```js
foo === 1 || [2, 3].includes(foo)
```

## Pass

```js
[1, 2, 3].includes(foo)
```

## Fail

```js
[1, 2].includes(foo) || [3, 4].includes(foo)
```

## Pass

```js
[1, 2, 3, 4].includes(foo)
```

## Fail

```js
![1, 2].includes(foo) || ![3, 4].includes(foo)
```

## Pass

```js
![1, 2, 3, 4].includes(foo)
```

## Pass

```js
foo == 1 || foo == 2 || foo == 3
```

```js
foo === 1 || foo == 2 || foo === 3
```

```js
foo === 1 || ![2, 3].includes(foo)
```

```js
![1, 2].includes(foo) || [2, 3].includes(foo)
```

```js
// eslint unicorn/consistent-includes: ['error', {minListItems: 3}]
if (foo === 1 || foo === 2) {}
```

## Options

Type: `object`

### `minListItems`

Type: `integer`\
Minimum: `2`\
Default: `2`
