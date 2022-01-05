# Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()`, `Array#splice()` and `Array#at()`

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

Prefer negative index over calculating from `.length` for [`String#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice), [`Array#slice`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice), [`TypedArray#slice`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/slice) , [`Array#splice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice) and [`Array#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at)

## Fail

```js
foo.slice(foo.length - 2, foo.length - 1);
```

```js
foo.splice(foo.length - 1, 1);
```

```js
foo.at(foo.length - 1);
```

```js
Array.prototype.slice.call(foo, foo.length - 2, foo.length - 1);
```

```js
Array.prototype.slice.apply(foo, [foo.length - 2, foo.length - 1]);
```

## Pass

```js
foo.slice(-2, -1);
```

```js
foo.splice(-1, 1);
```

```js
foo.at(-1);
```

```js
Array.prototype.slice.call(foo, -2, -1);
```

```js
Array.prototype.slice.apply(foo, [-2, -1]);
```

## Related rules

- [unicorn/prefer-at](./prefer-at.md)
