# Do not use `null`

Disallow the use of the `null` literal, to encourage using `undefined` instead.

## Fail

```js
let foo = null;

if (bar === null) {}
```

## Pass

```js
let foo;

Object.create(null)
```

### Why

- [“Intent to stop using `null` in my JS code”](https://github.com/sindresorhus/meta/issues/7).
- [TypeScript coding guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines#null-and-undefined).
- [ESLint rule proposal](https://github.com/eslint/eslint/issues/6701).
- [Douglas Crockford](https://www.youtube.com/watch?v=PSGEjv3Tqo0&t=9m21s) on bottom values in JavaScript.
