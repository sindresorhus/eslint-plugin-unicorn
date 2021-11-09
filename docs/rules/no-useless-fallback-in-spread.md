# Forbid useless fallback when spreading in object literals

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).

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
