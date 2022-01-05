# Disallow number literals with zero fractions or dangling dots

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

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
