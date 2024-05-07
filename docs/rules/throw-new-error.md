# Require `new` when throwing an error

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

While it's possible to create a new error without using the `new` keyword, it's better to be explicit.

## Fail

```js
throw Error();
```

```js
throw TypeError('unicorn');
```

```js
throw lib.TypeError();
```

## Pass

```js
throw new Error();
```

```js
throw new TypeError('unicorn');
```

```js
throw new lib.TypeError();
```
