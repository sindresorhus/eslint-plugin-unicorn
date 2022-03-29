# Prefer use `String`, `Number`, `BigInt`, `Boolean`, and `Symbol` directly

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

If a function is equivalent to [`String`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [`Number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number), [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt), [`Boolean`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean), or [`Symbol`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol), should use the built-in one directly.

## Fail

```js
const toBoolean = value => Boolean(value);
```

```js
function toNumber(value) {
	return Number(value);
}

if (toNumber(foo) === 1) {}
```

## Pass

```js
const toBoolean = Boolean;
```

```js
if (Number(foo) === 1) {}
```

```js
const toStringObject = value => new String(value);
```

```js
const toObject= value => Object(value);
```

## Note

We don't check implicit coercion like:

```js
const toString = value => '' + value;
```

```js
const toNumber = value => + value;
```

```js
const toBoolean = value => !!value;
```

It is recommended to enable the ESLint built-in rule [`no-implicit-coercion`](https://eslint.org/docs/rules/no-implicit-coercion) for better experience.
