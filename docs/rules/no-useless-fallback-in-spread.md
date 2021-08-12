# Forbid add empty object fallback as spread argument

All [falsy values](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) can spread directly in object, and won't add any unexpected properties, it's unnecessary to add empty object as fallback.

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
