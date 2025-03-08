# Disallow invalid options in `fetch()` and `new Request()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) throws a `TypeError` when the method is `GET` or `HEAD` and a body is provided.

## Fail

```js
const response = await fetch('/', {body: 'foo=bar'});
```

```js
const request = new Request('/', {body: 'foo=bar'});
```

```js
const response = await fetch('/', {method: 'GET', body: 'foo=bar'});
```

```js
const request = new Request('/', {method: 'GET', body: 'foo=bar'});
```

## Pass

```js
const response = await fetch('/', {method: 'HEAD'});
```

```js
const request = new Request('/', {method: 'HEAD'});
```

```js
const response = await fetch('/', {method: 'POST', body: 'foo=bar'});
```

```js
const request = new Request('/', {method: 'POST', body: 'foo=bar'});
```
