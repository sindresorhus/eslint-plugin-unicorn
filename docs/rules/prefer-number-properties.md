# Prefer `Number` static properties over global ones

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

ECMAScript 2015 moved globals onto the `Number` constructor for consistency and to slightly improve them. This rule enforces their usage to limit the usage of globals:

- [`Number.parseInt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/parseInt) over [`parseInt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt) *(fixable)*
- [`Number.parseFloat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/parseFloat) over [`parseFloat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat) *(fixable)*
- [`Number.isNaN()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN) over [`isNaN()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN) *(they have slightly [different behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN#difference_between_number.isnan_and_global_isnan))*
- [`Number.isFinite()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite) over [`isFinite()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isFinite) *(they have slightly [different behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite#difference_between_number.isfinite_and_global_isfinite))*
- [`Number.NaN`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/NaN) over [`NaN`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN) *(fixable)*
- [`Number.POSITIVE_INFINITY`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/POSITIVE_INFINITY) over [`Infinity`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Infinity) *(fixable)*
- [`Number.NEGATIVE_INFINITY`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/NEGATIVE_INFINITY) over [`-Infinity`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Infinity) *(fixable)*

## Fail

```js
const foo = parseInt('10', 2);
```

```js
const foo = parseFloat('10.5');
```

```js
const foo = isNaN(10);
```

```js
const foo = isFinite(10);
```

```js
if (Object.is(foo, NaN)) {}
```

```js
const {parseInt} = Number;
const foo = parseInt('10', 2);
```

## Pass

```js
const foo = Number.parseInt('10', 2);
```

```js
const foo = Number.parseFloat('10.5');
```

```js
const foo = Number.isNaN(10);
```

```js
const foo = Number.isFinite(10);
```

```js
if (Object.is(foo, Number.NaN)) {}
```

```js
const isPositiveZero = value => value === 0 && 1 / value === Number.POSITIVE_INFINITY;
```

```js
const isNegativeZero = value => value === 0 && 1 / value === Number.NEGATIVE_INFINITY;
```

```js
const isPositiveZero = value => value === 0 && 1 / value === Infinity;
```

```js
const isNegativeZero = value => value === 0 && 1 / value === -Infinity;
```

## Options

Type: `object`

### checkInfinity

Type: `boolean`\
Default: `false`

Pass `checkInfinity: true` to enable check on `Infinity`.

#### Fail

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkInfinity": true}]
const foo = Infinity;
```

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkInfinity": true}]
const foo = -Infinity;
```

#### Pass

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkInfinity": false}]
const foo = Infinity;
```

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkInfinity": false}]
const foo = -Infinity;
```

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkInfinity": true}]
const isPositiveZero = value => value === 0 && 1 / value === Number.POSITIVE_INFINITY;
```

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkInfinity": true}]
const isNegativeZero = value => value === 0 && 1 / value === Number.NEGATIVE_INFINITY;
```

### checkNaN

Type: `boolean`\
Default: `true`

Pass `checkNaN: false` to disable check on `NaN`.

#### Fail

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkNaN": true}]
const foo = NaN;
```

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkNaN": true}]
const foo = -NaN;
```

#### Pass

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkNaN": false}]
const foo = NaN;
```

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkNaN": false}]
const foo = -NaN;
```

```js
// eslint unicorn/prefer-number-properties: ["error", {"checkNaN": true}]
const isNaNFn = value => value !== value
```
