# Enforce lowercase identifier and uppercase value for number literals

Enforces a convention of defining number literals where the literal identifier is written in lowercase and the value in uppercase. Differentiating the casing of the identifier and value clearly separates them and makes your code more readable.


## Fail

```js
const foo = 0XFF;
const foo = 0xff;
const foo = 0Xff;
```

```js
const foo = 0B11;
```

```js
const foo = 0O10;
```


## Pass

```js
const foo = 0xFF;
```

```js
const foo = 0b11;
```

```js
const foo = 0o10;
```
