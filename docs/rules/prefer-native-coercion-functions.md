# Prefer using `String`, `Number`, `BigInt`, `Boolean`, and `Symbol` directly

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

If a function is equivalent to [`String`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [`Number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number), [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt), [`Boolean`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean), or [`Symbol`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol), you should use the built-in one directly. Wrapping the built-in in a function is moot.

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

```js
const hasTruthyValue = array.some(element => element);
```

## Pass

```js
const toBoolean = Boolean;
```

```js
if (Number(foo) === 1) {}
```

```js
const hasTruthyValue = array.some(Boolean);
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
const toNumber = value => +value;
```

```js
const toBoolean = value => !!value;
```

It is recommended to enable the built-in ESLint rule [`no-implicit-coercion`](https://eslint.org/docs/rules/no-implicit-coercion) for a better experience.
