# Enforce using the digits argument with `Number#toFixed()`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- RULE_NOTICE_END -->

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
