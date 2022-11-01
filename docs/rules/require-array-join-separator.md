# Enforce using the separator argument with `Array#join()`

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

It's better to make it clear what the separator is when calling [Array#join()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join), instead of relying on the default comma (`','`) separator.

## Fail

```js
const string = array.join();
```

```js
const string = Array.prototype.join.call(arrayLike);
```

```js
const string = [].join.call(arrayLike);
```

## Pass

```js
const string = array.join(',');
```

```js
const string = array.join('|');
```

```js
const string = Array.prototype.join.call(arrayLike, '');
```

```js
const string = [].join.call(arrayLike, '\n');
```
