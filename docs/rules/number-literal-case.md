# Enforce proper case for numeric literals

Differentiating the casing of the identifier and value clearly separates them and makes your code more readable.

- Lowercase identifier and uppercase value for [`Number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) and [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#BigInt_type).
- Lowercase `e` for exponential notation.

This rule is fixable.

## Fail

[Hexadecimal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Hexadecimal)

```js
const foo = 0XFF;
const foo = 0xff;
const foo = 0Xff;
const foo = 0Xffn;
```

[Binary](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Binary)

```js
const foo = 0B10;
const foo = 0B10n;
```

[Octal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Octal)

```js
const foo = 0O76;
const foo = 0O76n;
```

Exponential notation

```js
const foo = 2E-5;
```

## Pass

```js
const foo = 0xFF;
```

```js
const foo = 0b10;
```

```js
const foo = 0o76;
```

```js
const foo = 0xFFn;
```

```js
const foo = 2e+5;
```
