# Disallow unreadable array destructuring

Destructuring is very useful, but it can also make some code harder to read.

## Fail

```js
const [,, foo] = parts;
const [,,, foo] = parts;
const [,,,, foo] = parts;
```


## Pass

```js
const [, foo] = parts;
const [foo] = parts;
const foo = parts[3];
```
