# Require `new` when throwing an error

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

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
