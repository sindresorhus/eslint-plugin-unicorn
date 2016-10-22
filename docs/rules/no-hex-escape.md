# Enforce the use of unicode escapes instead of hexadecimal escapes

Enforces a convention of using [unicode escapes](https://mathiasbynens.be/notes/javascript-escapes#unicode) instead of [hexadecimal escapes](https://mathiasbynens.be/notes/javascript-escapes#hexadecimal) for consistency and clarity.


## Fail

```js
const foo = '\x1B';
const foo = `\x1B${bar}`;
```


## Pass

```js
const foo = '\u001B';
const foo = `\u001B${bar}`;
```
