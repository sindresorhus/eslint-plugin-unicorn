# Enforce a lowercase literal identifier and an uppercase value

Enforces a convention in defining number literals where the literal identifier is written in lowercase and the value in uppercase.


## Fail

```js
const foo = 0XFF;
const foo = 0xff;
const foo = 0Xff;

const foo = 0B11;

const foo = 0O10;
```


## Pass

```js
const foo = 0xFF;

const foo = 0b11;

const foo = 0o10;
```
