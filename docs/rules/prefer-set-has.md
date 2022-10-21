# Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Set#has()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has) is faster than [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).

## Fail

```js
const array = [1, 2, 3];
const hasValue = value => array.includes(value);
```

## Pass

```js
const set = new Set([1, 2, 3]);
const hasValue = value => set.has(value);
```

```js
// This array is not only checking existence.
const array = [1, 2];
const hasValue = value => array.includes(value);
array.push(3);
```

```js
// This array is only checked once.
const array = [1, 2, 3];
const hasOne = array.includes(1);
```
