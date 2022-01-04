# Forbid useless fallback when spreading in object literals

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

Spreading [falsy values](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) in object literals won't add any unexpected properties, so it's unnecessary to add an empty object as fallback.

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
