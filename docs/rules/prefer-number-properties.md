# Prefer `Number` static properties over global ones.

Enforces the use of:

- [`Number.parseInt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/parseInt) over [`parseInt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt) *(fixable)*
- [`Number.parseFloat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/parseFloat) over [`parseFloat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat) *(fixable)*
- [`Number.isNaN()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN) over [`isNaN()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN) *(they have slightly [different behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN#Description))*
- [`Number.isFinite()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite) over [`isFinite()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isFinite) *(they have slightly [different behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite#Description))*
- [`Number.NaN`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/NaN) over [`NaN`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN) *(fixable)*

This rule is partly fixable.

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
