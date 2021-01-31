# Enforce using HTTPS URLs over HTTP

Enforce using HTTPS URLs over HTTP.

This rule is fixable.

## Fail

```js
const foo = 'http://sindresorhus.com';
new URL('http://sindresorhus.com');
// http://sindresorhus.com
```

## Pass

```js
const foo = 'https://sindresorhus.com';
new URL('https://sindresorhus.com');
// https://sindresorhus.com

// Localhost/URLs without a TLD are ignored:
const foo = 'http://localhost';
```
