# Forbid useless fallback when spreading in object literals

Spreading [falsy values](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) in object literals won't add any unexpected properties, so it's unnecessary to add an empty object as fallback.

This rule is fixable.

## Fail

```js
const object = {...(foo || {})};
```

```js
const object = {...(foo ?? {})};
```

## Pass

```js
const object = {...foo};
```

```js
const object = {...(foo && {})};
```

```js
const array = [...(foo || [])];
```
