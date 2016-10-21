# Enforce the use of unicode encoded escapes instead of hexadecimal encoded escapes

Enforces a convention of using unicode encoded escapes instead of hexadecimal encoded escapes to enfoce code consistency. Works on both Literals and TemplateLiterals.

## Fail

```js
const foo = '\x1B';
const foo = '\x1b';
```

```js
const foo = `\x1B${bar}`;
```

## Pass

```js
const foo = '\u001B';
const foo = '\u001b';
```

```js
const foo = `\u001B${bar}`;
```
