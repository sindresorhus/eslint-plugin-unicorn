# Disallow a magic number as the `depth` argument in `Array#flat(…).`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When calling [`Array#flat(depth)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat), the depth argument should normally be `1` or `Infinity`, otherwise it should be a meaningful variable name or explained with a comment.

## Fail

```js
const foo = array.flat(2);
```

```js
const foo = array.flat(99);
```

## Pass

```js
const foo = array.flat();
```

```js
const foo = array.flat(Number.POSITIVE_INFINITY);
```

```js
const foo = array.flat(Infinity);
```

```js
const foo = array.flat(depth);
```

```js
const foo = array.flat(/* The depth is always 2 */ 2);
```
