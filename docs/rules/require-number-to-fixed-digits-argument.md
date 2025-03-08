# Enforce using the digits argument with `Number#toFixed()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

It's better to make it clear what the value of the `digits` argument is when calling [Number#toFixed()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed), instead of relying on the default value of `0`.

## Fail

```js
const string = number.toFixed();
```

## Pass

```js
const string = foo.toFixed(0);
```

```js
const string = foo.toFixed(2);
```

```js
const integer = Math.floor(foo);
```

```js
const integer = Math.ceil(foo);
```

```js
const integer = Math.round(foo);
```

```js
const integer = Math.trunc(foo);
```
