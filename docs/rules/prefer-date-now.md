# Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch

[`Date.now()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now) is shorter and nicer than [`new Date().getTime()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime), and avoids unnecessary instantiation of `Date` objects.

This rule is fixable.

## Fail

```js
const foo = new Date().getTime();
```

```js
const foo = new Date().valueOf();
```

```js
const foo = +new Date;
```

```js
const foo = Number(new Date());
```

```js
const foo = new Date() * 2;
```

## Pass

```js
const foo = Date.now();
```

```js
const foo = Date.now() * 2;
```
