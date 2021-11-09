# Disallow number literals with zero fractions or dangling dots

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

There is no difference in JavaScript between, for example, `1`, `1.0` and `1.`, so prefer the former for consistency.

## Fail

```js
const foo = 1.0;
```

```js
const foo = -1.0;
```

```js
const foo = 123_456.000_000;
```

```js
const foo = 1.;
```

```js
const foo = 123.111000000;
```

```js
const foo = 123.00e20;
```

## Pass

```js
const foo = 1;
```

```js
const foo = -1;
```

```js
const foo = 123456;
```

```js
const foo = 1.1;
```

```js
const foo = -1.1;
```

```js
const foo = 123.456;
```

```js
const foo = 1e3;
```
