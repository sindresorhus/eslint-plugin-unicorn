# Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`.

<!-- More detailed description. Remove this comment. -->

This rule is fixable.

## Fail

```js
const foo = 'unicorn';
```

## Pass

```js
const foo = '🦄';
```
